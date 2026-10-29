# Dreamcore asset generation prompts

Mode: built-in image_gen. Date: 2026-10-29.

Reference 1: user-provided pastel repeating suburban street, used as visual direction described in prompts.
Reference 2: user-provided white house against a black sky filled with grayscale eyes, attached to the sky-generation call as a reference.
User reference images are not redistributed in this asset pack.

## grass-dreamcore-v1.png

```text
Use case: stylized-concept.
Asset type: production raster base-color texture for a Three.js first-person dreamcore game.
Visual direction: an impossibly clean, empty suburban neighborhood of repeating pastel clapboard houses, manicured vivid green lawns, muted purple asphalt, artificial sunny nostalgia and subtly unsettling early-digital realism.
Primary request: one square seamless grass albedo texture, preferably 1024x1024. Entire image is evenly clipped fine lawn grass, dense saturated fresh green with restrained fine blade detail and subtle natural variation, slightly artificial carpetlike suburban perfection. Orthographic straight down, uniform scale across the entire image. Flat neutral diffuse illumination, no directional lighting, no shadows, no vignette, no specular highlights. Edge-to-edge surface only. Seamlessly tile on both axes with matched edges. No horizon, houses, paving, flowers, dirt patches, large clumps, props, text, border, watermark, atlas or contact sheet. Deliver only this one material texture.
```

## asphalt-dreamcore-v1.png

```text
Use case: stylized-concept.
Asset type: production raster base-color texture for a Three.js first-person dreamcore game.
Visual direction: an impossibly clean, empty suburban neighborhood of repeating pastel clapboard houses, manicured vivid green lawns, muted purple asphalt, artificial sunny nostalgia and subtly unsettling early-digital realism.
Primary request: one square seamless road asphalt albedo texture, preferably 1024x1024. Entire image is quiet, smooth, fine-grained muted dusty lavender-gray asphalt, reminiscent of the purple road in an uncanny pastel suburb. Restrained fine aggregate, soft uniform finish, minimal contrast so it can repeat over a long road. Orthographic straight down. Flat neutral illumination, no shadows, highlights, gradients, perspective or vignette. Seamlessly tile on both axes with matched edges. No road markings, cracks, curbs, objects, debris, grass, horizon, text, border, watermark, atlas or contact sheet. Deliver only this one material texture.
```

## siding-tintable-v1.png

```text
Use case: stylized-concept.
Asset type: production raster base-color texture for a Three.js first-person dreamcore game.
Visual direction: an impossibly clean, empty suburban neighborhood of repeating pastel clapboard houses, manicured vivid green lawns, muted purple asphalt, artificial sunny nostalgia and subtly unsettling early-digital realism.
Primary request: one square seamless neutral white horizontal clapboard siding base-color texture, preferably 1024x1024, for repeating pastel houses. Full-frame straight-on orthographic closeup of evenly spaced horizontal painted wooden siding courses. Clean off-white almost neutral light gray surface with very subtle wood grain; subtle thin gray grooves and bevel cues only, no deep baked shadows. This texture will be tinted pink, yellow, mint green or pale blue in the game, so keep it nearly neutral grayscale. Every course perfectly horizontal, consistent spacing; integral number of courses across image height so it repeats on both axes; matching edges. Uniform neutral diffuse illumination, no gradient, ambient occlusion, vignette or dramatic lighting. No nails, windows, doors, corner trim, roof, buildings, scene, text, labels, border, watermark or contact sheet. Deliver only this one material texture.
```

## sky-eyes-nightmare-v1.png

```text
Use case: stylized-concept.
Asset type: flat unlit 2:1 panoramic sky background texture for the nightmare state of a Three.js dreamcore game, preferably 2048x1024.
Input image: the attached eye-covered sky and white-house image is a STYLE AND SUBJECT REFERENCE. Derive a new sky-only texture from its black void and monochrome watching eyes. Remove all buildings and all ground.
Primary request: fill the entire panoramic image with a deep black void containing many detached, photorealistic grayscale open human eyes of different sizes, each with glossy near-black iris and pupil, small pale highlights, softly smoky eyelids fading into pure black. Like an uncanny analog collage surrounding the viewer. Eyes scattered at irregular intervals and irregular scale, separated by black space; looking toward viewer, oppressive watchfulness. Match the grainy lo-fi black-and-white uncanny atmosphere of the reference, no blood or wounds.
Composition: a single continuous extra-wide sky panorama, edge-to-edge eyes and black void, with compatible left and right edges for horizontal wrap. No horizon or ground of any kind, no house, faces, heads, bodies, stars, clouds, color, typography, watermark, border, labels, panels or preview sphere. This is a raw sky texture, not an environment screenshot. Keep eyes at top and bottom smaller to reduce visible stretching at sphere poles. Opaque black background.
```
