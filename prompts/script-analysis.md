# Script Analysis Prompt

Inputs: source script, language, audience, desired format, and project constraints.

Normalize the source into ordered production segments compatible with `schemas/production-script.schema.json`. Preserve meaning, identify speakers and pronunciation/timing risks, and assign stable source IDs that later become storyboard `textRefs`. Mark ambiguity rather than inventing facts. Do not synthesize voice or create visual assets.
