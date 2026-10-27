// Sponsor logos shown on /info: every logo in genhoer-data (data/logoer.yaml), in alphabetical order.
// The build writes partners.json and copies the logos to public/logos/<name>-logo.svg; the committed
// files are a snapshot so `npm run dev` works without access to genhoer-data.
import data from './partners.json';

export const partners = data;
