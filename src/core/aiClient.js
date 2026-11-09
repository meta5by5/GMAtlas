// aiClient.js — the stub for sending the Composer's encounter prompt to an
// AI client automatically (direct request, 2026-11-08: "a button that will
// compile all the content into a well formed prompt and copy it ... with
// stub to automate the formation of encounter description in future
// design").
//
// Today nothing is sent anywhere: the Composer's "Copy AI prompt" button
// copies domain/encounters.js composerPrompt() to the clipboard for the GM
// to paste into whatever AI client they use. When automation is designed,
// this is the one module that talks to the AI service:
//   - configured(): whether an AI service is set up (an endpoint, a key or
//     an account feature) — false until then, so no UI offers automation;
//   - describeEncounter(prompt): sends the prompt, resolves to the reply
//     parsed by encounters.js parseEncounterReply ({title, description,
//     hooks}), which the Composer would offer to write into the Encounter.
// Rule 6 still applies: only the prompt text (campaign metadata the GM
// chose to send) would leave the device, never document bytes.

/** Whether automated encounter descriptions are available. */
export function configured() {
  return false;
}

/** Sends the prompt to the AI service. Not implemented yet: rejects so a
 *  caller that skipped configured() fails loudly rather than silently. */
export async function describeEncounter(/* prompt */) {
  throw new Error('Automatic encounter descriptions aren’t set up yet. Copy the prompt into your AI client instead.');
}
