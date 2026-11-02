// Logos shown in the scrolling footer on /info: organisations that have contributed to a project that is
// under way (phase Produktion, Udstilling or Afsluttet) – granted support, co-funding, named as partner or
// with their logo on the project page – but not Genhør itself. Worked out by genhoer-data
// (scripts/offentlig.js), in alphabetical order by id. genhoer-data's Data workflow writes partners.json and
// copies every logo to public/logos/<name>-logo.svg (project pages use them too) whenever they change.
// Do not edit them by hand; they are overwritten.
import data from './partners.json';

export const partners = data;
