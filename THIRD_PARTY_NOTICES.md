# Third-party notices

Meaw Tools uses the following third-party software and model for the client-side AI Background Remover:

## ONNX Runtime Web

- Project: `onnxruntime-web`
- Source: https://github.com/microsoft/onnxruntime
- License: MIT

## U-2-Netp model

- Model: `BritishWerewolf/U-2-Netp`
- Source: https://huggingface.co/BritishWerewolf/U-2-Netp
- Original U-2-Net project: https://github.com/xuebinqin/U-2-Net
- License declared by the model publisher: Apache License 2.0

The full license texts and package notices remain available from their respective upstream projects and installed packages.

## QR Code decoder

- `jsQR` 1.4.0 — Apache License 2.0
  - Source: https://github.com/cozmo/jsQR
  - License: https://github.com/cozmo/jsQR/blob/master/LICENSE

The QR Code Scanner loads this decoder only when the user starts scanning. Image and camera pixels remain in the browser and are not sent to the upstream project.

## HEIC decoder

The HEIC to JPG tool distributes an unmodified WebAssembly decoder as a
separate, lazy-loaded browser asset.

- `@discourse/heic` 1.0.0 — Apache License 2.0
  - Source: https://github.com/discourse/jSquash/tree/main/packages/heic
  - License: https://github.com/discourse/jSquash/blob/main/LICENSE
- `libheif` 1.19.7 — GNU Lesser General Public License
  - Source: https://github.com/strukturag/libheif/tree/v1.19.7
  - License: https://github.com/strukturag/libheif/blob/v1.19.7/COPYING
- `libde265` 1.0.15 — GNU Lesser General Public License 3.0
  - Source: https://github.com/strukturag/libde265/tree/v1.0.15
  - License: https://github.com/strukturag/libde265/blob/v1.0.15/COPYING

The upstream build recipe used for the WebAssembly decoder is available at
https://github.com/discourse/jSquash/blob/main/packages/heic/codec/Makefile. It
links the listed versions of `libheif` and `libde265`. The Meaw Tools application
source is available at https://github.com/Benz1995/Meaw-Tools. These sources and
build instructions allow the decoder to be rebuilt or replaced with a compatible
modified version. Meaw Tools does not modify the listed third-party libraries.

Full license texts:

- Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0
- GNU LGPL 3.0: https://www.gnu.org/licenses/lgpl-3.0.html
- GNU GPL 3.0: https://www.gnu.org/licenses/gpl-3.0.html

This notice is informational and is not legal advice.
