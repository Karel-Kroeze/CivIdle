import { GameState } from "../logic/GameState";
import { getMyMapXy, usePlayerMap } from "../rpc/RPCClient";
import { MyTilePage } from "./MyTilePage";
import { UnclaimedTilePage } from "./UnclaimedTilePage";

export function PlayerMapPage({ xy }: { xy: string }): JSX.Element | null {
   const playerMap = usePlayerMap();
   const myXy = getMyMapXy();
   if (myXy == xy) {
      return <MyTilePage xy={xy} />;
   } else if (playerMap[xy]) {
      return <></>;
   } else {
      return <UnclaimedTilePage xy={xy} />;
   }
}

export interface IBuildingComponentProps {
   gameState: GameState;
   xy: string;
}