---
name: Claude Prompt Lab settings
description: Provider-specific limits for the Aurora chat's Prompt Lab controls.
---

Use Claude Sonnet 5.5 for chat. Expose the max-output-token control, but do not expose temperature or Top P controls for this model.

**Why:** The user chose Claude and chose to hide the sampling sliders because the current Claude Messages API does not accept those parameters.

**How to apply:** When changing this app's chat provider or model, verify supported request parameters before exposing controls. Never show a control as active if the API ignores it.
