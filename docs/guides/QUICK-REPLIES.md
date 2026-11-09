# Teyvat Choices setup

Teyvat Choices is built into Silly Teyvat 1.3. You no longer need to import a Quick Reply preset, enable Quick Reply auto-execution, choose an Extras API, or add a Generate choices button.

1. Refresh SillyTavern after installing the updated extension.
2. Open **Extensions → Silly Teyvat**. Enable **dialogue view** and **Teyvat Choices and Genshin HUD icons**. Choices are enabled by default when dialogue view is on.
3. Connect your usual **main Chat Completion API** in **API Connections** and select your normal model. No separate connection is used for suggestions.
4. Open a character or group chat. Three replies are generated automatically for the latest character message and after each completed character response. Read to the final dialogue page to see them.
5. Click the small circular **refresh arrow** above the choices to regenerate them. Click a reply to **send it immediately** and start the character's response. Use **Reply** for freeform text.

Each automatic generation or refresh makes one short request to the selected main API. Refresh never posts a chat message. Suggested replies are kept in memory and do not become chat messages until you click one. New messages, swipes and chat changes discard stale choices. Requests are cancelled when the feature is turned off or the chat changes. A failed refresh keeps the previous options available and shows a retry message.

The suggestion request uses a copy of the main connection settings. It requests non-streaming output, one result, a 240-token limit, no tools and no thinking. Your normal chat generation preferences stay as configured. With the current Custom DeepSeek connection, the provider receives `thinking: {type: disabled}`. A live fixture request returned three valid choices and zero reported reasoning tokens. A model that requires reasoning cannot be made non-thinking by hiding its reasoning text; choose a model/provider that supports disabling it. Text Completion connections are not supported by the integrated generator.

The top-right HUD uses white Genshin-style icons while this option is enabled. The Traveler-head icon opens **Character Management**. The calendar/star icon opens **Extensions**, the comet opens **AI Response Configuration**, the book opens **World Info**, the scroll opens **AI Response Formatting**, the backpack opens **Persona Management**, the landscape opens **Backgrounds**, the compass/star opens **API Connections**, and the gear opens **User Settings**. Existing drawer actions and tooltips are retained. Menu windows open centered inside a gold border and stay within the viewport, with internal scrolling for long settings pages.

## Updating from the older preset

The installed **Teyvat Choices** Quick Reply set has been migrated to an empty compatibility set. Its old generator and copy-to-composer scripts are removed, so they cannot duplicate the integrated automatic requests. Other Quick Reply sets keep their configuration and actions.

For a different installation, delete the old Teyvat Choices set in Quick Reply settings, or import `quick-replies/Teyvat Choices.json` over that set. The included empty set is only for removing those old actions. It is not needed on a fresh installation. Do not enable any old Teyvat generator scripts on AI-message events.

## Turning it off

Uncheck **Teyvat Choices and Genshin HUD icons** to stop automatic suggestions and restore the original toolbar icons while keeping dialogue pages. The compass or Alt+G turns off the entire dialogue mode. Your API connection, character cards, sprites and other Quick Reply sets remain configured as before.
