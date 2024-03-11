import classNames from "classnames";
import { useState, type ReactNode } from "react";
import type { Resource } from "../../../shared/definitions/ResourceDefinitions";
import { getMarketBuyAmount, getMarketSellAmount } from "../../../shared/logic/BuildingLogic";
import { Config } from "../../../shared/logic/Config";
import { notifyGameStateUpdate } from "../../../shared/logic/GameStateLogic";
import { getBuildingsByType } from "../../../shared/logic/IntraTickCache";
import type { IMarketBuildingData } from "../../../shared/logic/Tile";
import { convertPriceIdToTime } from "../../../shared/logic/Update";
import {
   CURRENCY_EPSILON,
   forEach,
   formatHMS,
   formatPercent,
   mathSign,
   type Tile,
} from "../../../shared/utilities/Helper";
import { L, t } from "../../../shared/utilities/i18n";
import { LookAtMode, WorldScene } from "../scenes/WorldScene";
import { Singleton } from "../utilities/Singleton";
import { playClick } from "../visuals/Sound";
import { BuildingColorComponent } from "./BuildingColorComponent";
import { BuildingDescriptionComponent } from "./BuildingDescriptionComponent";
import type { IBuildingComponentProps } from "./BuildingPage";
import { BuildingWikipediaComponent } from "./BuildingWikipediaComponent";
import { FormatNumber } from "./HelperComponents";
import { RenderHTML } from "./RenderHTMLComponent";
import { TableView } from "./TableView";
import { TextWithHelp } from "./TextWithHelpComponent";
import { WarningComponent } from "./WarningComponent";

interface IGrandBazaarMarketData {
   xy: Tile;
   sellResource: Resource;
   sellAmount: number;
   buyResource: Resource;
   buyAmount: number;
}

function calculateTradeValue(item: IGrandBazaarMarketData): number {
   return (
      (item.buyAmount * Config.ResourcePrice[item.buyResource]!) /
         (item.sellAmount * Config.ResourcePrice[item.sellResource]!) -
      1
   );
}

export function GrandBazaarBuildingBody({ gameState, xy }: IBuildingComponentProps): React.ReactNode {
   const [buyResourceFilter, setBuyResourceFilter] = useState<Resource | null>(null);
   const [sellResourceFilter, setSellResourceFilter] = useState<Resource | null>(null);

   const building = gameState.tiles.get(xy)?.building;
   if (!building) {
      return null;
   }

   const marketBuildings = getBuildingsByType("Market", gameState);
   const availableResourcesSet = new Set<Resource>();

   const allMarketTrades: IGrandBazaarMarketData[] = [];
   marketBuildings?.forEach((tile, xy) => {
      const market = tile.building as IMarketBuildingData;
      if (market.status !== "completed") {
         return;
      }
      forEach(market.availableResources, (sellResource, buyResource) => {
         availableResourcesSet.add(sellResource);
         availableResourcesSet.add(buyResource);
         const sellAmount = getMarketSellAmount(sellResource, xy, gameState);
         allMarketTrades.push({
            xy,
            sellResource,
            sellAmount,
            buyResource,
            buyAmount: getMarketBuyAmount(sellResource, sellAmount, buyResource, xy, gameState),
         });
      });
   });

   const availableResources = Array.from(availableResourcesSet).sort((a, b) =>
      Config.Resource[a].name().localeCompare(Config.Resource[b].name()),
   );

   return (
      <div className="window-body">
         <BuildingDescriptionComponent gameState={gameState} xy={xy} />
         <fieldset>
            <div className="row">
               <div className="f1">{t(L.NextMarketUpdateIn)}</div>
               <div className="text-strong">
                  {formatHMS(convertPriceIdToTime(gameState.lastPriceUpdated + 1) - Date.now())}
               </div>
            </div>
         </fieldset>
         <fieldset>
            <legend>{t(L.GrandBazaarFilters)}</legend>
            <div className="row">
               <div style={{ width: "120px" }}>{t(L.GrandBazaarFilterYouPay)}</div>
               <select
                  className="f1"
                  value={sellResourceFilter ? sellResourceFilter : ""}
                  onChange={(e) => {
                     if (e.target.value === "") {
                        setSellResourceFilter(null);
                     }
                     if (e.target.value in Config.Resource) {
                        setSellResourceFilter(e.target.value as Resource);
                     }
                  }}
               >
                  <option value=""></option>
                  {availableResources.map((res) => (
                     <option key={res} value={res}>
                        {Config.Resource[res].name()}
                     </option>
                  ))}
               </select>
            </div>
            <div className="sep10"></div>
            <div className="row">
               <div style={{ width: "120px" }}>{t(L.GrandBazaarFilterYouGet)}</div>
               <select
                  className="f1"
                  value={buyResourceFilter ? buyResourceFilter : ""}
                  onChange={(e) => {
                     if (e.target.value === "") {
                        setBuyResourceFilter(null);
                     }
                     if (e.target.value in Config.Resource) {
                        setBuyResourceFilter(e.target.value as Resource);
                     }
                  }}
               >
                  <option value=""></option>
                  {availableResources.map((res) => (
                     <option key={res} value={res}>
                        {Config.Resource[res].name()}
                     </option>
                  ))}
               </select>
            </div>
         </fieldset>
         {buyResourceFilter === null && sellResourceFilter === null ? (
            <WarningComponent icon="info" className="mb10 text-small">
               <RenderHTML html={t(L.GrandBazaarFilterWarningHTML)} />
            </WarningComponent>
         ) : null}
         <TableView
            classNames="sticky-header f1"
            header={[
               { name: t(L.MarketYouPay), sortable: true },
               { name: t(L.MarketYouGet), sortable: true },
               { name: "", sortable: true },
               { name: t(L.MarketSell), sortable: true },
               { name: "", sortable: false },
            ]}
            data={allMarketTrades.filter((m) => {
               // No filter, we show nothing, should revisit this later
               if (buyResourceFilter === null && sellResourceFilter === null) {
                  return false;
               }
               let buyFilter = false;
               let sellFilter = false;
               if (buyResourceFilter != null) {
                  buyFilter = buyResourceFilter === m.buyResource;
               } else {
                  buyFilter = true;
               }
               if (sellResourceFilter != null) {
                  sellFilter = sellResourceFilter === m.sellResource;
               } else {
                  sellFilter = true;
               }
               return buyFilter && sellFilter;
            })}
            compareFunc={(a, b, i) => {
               switch (i) {
                  case 0:
                     return Config.Resource[a.sellResource]
                        .name()
                        .localeCompare(Config.Resource[b.sellResource].name());
                  case 1:
                     return Config.Resource[a.buyResource]
                        .name()
                        .localeCompare(Config.Resource[b.buyResource].name());
                  case 2:
                     return (calculateTradeValue(a) ?? 0) - (calculateTradeValue(b) ?? 0);
                  default:
                     return 0;
               }
            }}
            renderRow={(item) => {
               const building = gameState.tiles.get(item.xy)?.building as IMarketBuildingData;
               const sellResource = Config.Resource[item.sellResource];
               const buyResource = Config.Resource[item.buyResource];
               const tradeValue = calculateTradeValue(item);
               return (
                  <tr key={`Res:${item.sellResource}Tile:${item.xy}`}>
                     <td>
                        <div>{sellResource.name()}</div>
                        <div className="text-small text-desc text-strong">
                           <FormatNumber value={item.sellAmount} />
                        </div>
                     </td>
                     <td>
                        <div>{buyResource.name()}</div>
                        <div className="text-small text-desc text-strong">
                           <FormatNumber value={item.buyAmount} />
                        </div>
                     </td>
                     <td
                        className={classNames({
                           "text-green": tradeValue > 0,
                           "text-red": tradeValue < 0,
                           "text-right text-small": true,
                        })}
                     >
                        <TextWithHelp
                           content={t(L.MarketValueDesc, {
                              value: formatPercent(tradeValue, 0),
                           })}
                           noStyle
                        >
                           {mathSign(tradeValue, CURRENCY_EPSILON)}
                           {formatPercent(Math.abs(tradeValue), 0)}
                        </TextWithHelp>
                     </td>
                     <td
                        className="pointer"
                        onClick={() => {
                           playClick();
                           if (building.sellResources[item.sellResource]) {
                              delete building.sellResources[item.sellResource];
                           } else {
                              // Turn the market on if it's been turned off, else keep capacity the same.
                              building.capacity = building.capacity === 0 ? 1 : building.capacity;
                              building.sellResources[item.sellResource] = true;
                           }
                           notifyGameStateUpdate();
                        }}
                     >
                        {building.sellResources[item.sellResource] ? (
                           <div className="m-icon text-green">toggle_on</div>
                        ) : (
                           <div className="m-icon text-grey">toggle_off</div>
                        )}
                     </td>
                     <td style={{ width: 0 }}>
                        <div
                           className="m-icon small pointer"
                           onPointerDown={() => {
                              playClick();
                              Singleton()
                                 .sceneManager.getCurrent(WorldScene)
                                 ?.lookAtTile(item.xy, LookAtMode.Select);
                           }}
                        >
                           open_in_new
                        </div>
                     </td>
                  </tr>
               );
            }}
         />
         <div className="sep10"></div>
         <fieldset>
            <legend>{t(L.ActiveMarketTrades)}</legend>
            <TableView             
            classNames="sticky-header f1"
            header={[
               { name: t(L.MarketYouPay), sortable: true },
               { name: t(L.MarketYouGet), sortable: true },
               { name: "", sortable: true },
               { name: "", sortable: false },
               { name: "", sortable: false },
            ]}
            data={allMarketTrades.filter(item => {
               const building = gameState.tiles.get(item.xy)?.building as IMarketBuildingData;
               return building.sellResources[item.sellResource]
            })} 
            renderRow={function (item): ReactNode {
               const building = gameState.tiles.get(item.xy)?.building as IMarketBuildingData;
               const sellResource = Config.Resource[item.sellResource];
               const buyResource = Config.Resource[item.buyResource];
               const tradeValue = calculateTradeValue(item);
               return (
                  <tr key={`Res:${item.sellResource}Tile:${item.xy}`}>
                     <td>
                        <div>{sellResource.name()}</div>
                        <div className="text-small text-desc text-strong">
                           <FormatNumber value={item.sellAmount} />
                        </div>
                     </td>
                     <td>
                        <div>{buyResource.name()}</div>
                        <div className="text-small text-desc text-strong">
                           <FormatNumber value={item.buyAmount} />
                        </div>
                     </td>
                     <td
                        className={classNames({
                           "text-green": tradeValue > 0,
                           "text-red": tradeValue < 0,
                           "text-right text-small": true,
                        })}
                     >
                        <TextWithHelp
                           content={t(L.MarketValueDesc, {
                              value: formatPercent(tradeValue, 0),
                           })}
                           noStyle
                        >
                           {mathSign(tradeValue, CURRENCY_EPSILON)}
                           {formatPercent(Math.abs(tradeValue), 0)}
                        </TextWithHelp>
                     </td>
                     <td  style={{ width: 0 }}>
                        <div
                        className="m-icon small text-red pointer"
                        onClick={() => {
                           playClick();
                           delete building.sellResources[item.sellResource];
                           notifyGameStateUpdate();
                        }}>
                           delete
                        </div>
                     </td>
                     <td style={{ width: 0 }}>
                        <div
                           className="m-icon small pointer"
                           onPointerDown={() => {
                              playClick();
                              Singleton()
                                 .sceneManager.getCurrent(WorldScene)
                                 ?.lookAtTile(item.xy, LookAtMode.Select);
                           }}
                        >
                           open_in_new
                        </div>
                     </td>
                  </tr>
               );
            } } 
            compareFunc={(a, b, i) => {
               switch (i) {
                  case 0:
                     return Config.Resource[a.sellResource]
                        .name()
                        .localeCompare(Config.Resource[b.sellResource].name());
                  case 1:
                     return Config.Resource[a.buyResource]
                        .name()
                        .localeCompare(Config.Resource[b.buyResource].name());
                  case 2:
                     return (calculateTradeValue(a) ?? 0) - (calculateTradeValue(b) ?? 0);
                  default:
                     return 0;
               }
            }} />
         </fieldset>
         <div className="sep10"></div>
         <BuildingWikipediaComponent gameState={gameState} xy={xy} />
         <BuildingColorComponent gameState={gameState} xy={xy} />
      </div>
   );
}
