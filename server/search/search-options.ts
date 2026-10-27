import { z } from "zod";
import type { ContactSearchConfig } from "./types";

/**
 * Search options are the switches a caller sets when it starts a search, like the buttons next to the
 * web app's search box. Each option is one plain value with a default. A new option, for this search or
 * another, gets its field in `searchOptionsSchema`, its default in `normalizeSearchOptions`, its check in
 * `sameSearchOptions` and its effect where the job's settings are built, as `people` has in
 * `contactSearchConfigFor`.
 */
export const searchOptionsSchema = z.object({
  /** Who to find at each company: one of `PEOPLE_PRESETS`, or any role, such as "Head of Sales" */
  people: z.string().trim().min(1).max(100).optional(),
}).strict();

export type SearchOptions = z.infer<typeof searchOptionsSchema>;
export type NormalizedSearchOptions = Required<SearchOptions>;

/**
 * The web app's people buttons, by the name each one shows. The contact finder's settings are older than
 * the buttons: its "department heads" search finds marketing leaders, and its "middle management" search
 * finds technical leaders.
 */
const PEOPLE_PRESETS = {
  leadership: { enableCoreLeadership: true },
  marketing: { enableDepartmentHeads: true },
  cto: { enableMiddleManagement: true },
} satisfies Record<string, ContactSearchConfig>;

const DEFAULT_PEOPLE = "leadership";

function isPeoplePreset(people: string): people is keyof typeof PEOPLE_PRESETS {
  return Object.hasOwn(PEOPLE_PRESETS, people);
}

/** Fills in the defaults and spells each preset one way, so options that mean the same compare equal */
export function normalizeSearchOptions(options: SearchOptions): NormalizedSearchOptions {
  const people = options.people?.trim() || DEFAULT_PEOPLE;
  return { people: isPeoplePreset(people.toLowerCase()) ? people.toLowerCase() : people };
}

/** Whether a search that ran with `ranWith` answers a request for `requested` */
export function sameSearchOptions(requested: NormalizedSearchOptions, ranWith: NormalizedSearchOptions): boolean {
  return requested.people.toLowerCase() === ranWith.people.toLowerCase();
}

/** The contact finder's settings for the chosen people: one preset search, or a search for the role as written */
export function contactSearchConfigFor(options: NormalizedSearchOptions): ContactSearchConfig {
  const noPeopleChosen: ContactSearchConfig = {
    enableCoreLeadership: false,
    enableDepartmentHeads: false,
    enableMiddleManagement: false,
    enableCustomSearch: false,
    enableCustomSearch2: false,
  };
  return isPeoplePreset(options.people)
    ? { ...noPeopleChosen, ...PEOPLE_PRESETS[options.people] }
    : { ...noPeopleChosen, enableCustomSearch: true, customSearchTarget: options.people };
}
