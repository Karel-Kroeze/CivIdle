import { PatchNotes } from "../../../shared/definitions/PatchNotes";
import { L, t } from "../../../shared/utilities/i18n";
import { MenuComponent } from "./MenuComponent";

export function PatchNotesPage(): React.ReactNode {
   return (
      <div className="window">
         <div className="title-bar">
            <div className="title-bar-text">{t(L.PatchNotes)}</div>
         </div>
         <MenuComponent />
         <div className="window-body" style={{ userSelect: "text" }}>
            {PatchNotes.map((note) => {
               return (
                  <fieldset key={note.version}>
                     <legend className="text-strong">{note.version}</legend>
                     {note.content.map((c, i) => {
                        return (
                           <div key={i} className="mv5">
                              <b>{c[0]}:</b> {c[1]}
                           </div>
                        );
                     })}
                  </fieldset>
               );
            })}
         </div>
      </div>
   );
}
