# EasyDrive Fleet Photo Directory (`client/assets/cars/`)

This folder stores the local vehicle imagery for EasyDrive.

## Image Specification Guidelines
- **Format:** Modern `.webp`
- **Dimensions:** `800 × 500 px` (16:10 aspect ratio)
- **File Size:** Under `100 KB` per photo for ultra-fast loading and 90+ Lighthouse performance
- **Angle:** Front 3/4 dynamic studio or outdoor view on clean asphalt/neutral background
- **Fallback:** If any image is absent or encounters a loading error, the app automatically renders a crisp, branded placeholder card with the car model and silhouette.

---

## Folder Structure & Source Originals
- `_source/`: Raw studio JPG images (`originals before processing`) containing vehicle captures with cream studio backdrops. Do NOT delete this folder.
- `tools/process_cars.py`: Python processing pipeline that crops the bounding box, samples the cream studio color, centers on a 16:10 canvas with 4% horizontal margin, and exports 800x500 WebP at quality 85.
- Root (`client/assets/cars/*.webp`): The 12 production vehicle images displayed in the UI.

---

## 12 Required Vehicle Files & Photo Credits Registry

All 12 vehicles are processed and active in `.webp` format at `800 × 500 px`:

| # | Exact Filename | Brand & Model | Vehicle Category | Source File (`_source/`) | Photo Credit | Status |
|---|---|---|---|---|---|---|
| 1 | `maruti-swift.webp` | Maruti Suzuki Swift ZXi+ | Hatchback | `01_maruti_swift.jpg` | Demo image | Active (800x500 WebP) |
| 2 | `hyundai-i20.webp` | Hyundai i20 Asta (O) | Hatchback | `08_hyundai_i20.jpg` | Demo image | Active (800x500 WebP) |
| 3 | `honda-city.webp` | Honda City ZX | Sedan | `02_honda_city.jpg` | Demo image | Active (800x500 WebP) |
| 4 | `hyundai-verna.webp` | Hyundai Verna SX (O) Turbo | Sedan | `09_hyundai_verna.jpg` | Demo image | Active (800x500 WebP) |
| 5 | `hyundai-creta.webp` | Hyundai Creta SX (O) | SUV | `03_hyundai_creta.jpg` | Demo image | Active (800x500 WebP) |
| 6 | `mahindra-thar.webp` | Mahindra Thar LX 4x4 | SUV | `04_mahindra_thar.jpg` | Demo image | Active (800x500 WebP) |
| 7 | `mahindra-xuv700.webp`| Mahindra XUV700 AX7 | SUV | `05_mahindra_xuv700.jpg` | Demo image | Active (800x500 WebP) |
| 8 | `toyota-fortuner.webp`| Toyota Fortuner 4x4 | SUV | `10_toyota_fortuner.jpg` | Demo image | Active (Note: plate text misspelled, pending replacement) |
| 9 | `toyota-innova-crysta.webp`| Toyota Innova Crysta ZX | MPV | `06_toyota_innova_crysta.jpg` | Demo image | Active (800x500 WebP) |
| 10| `tata-nexon-ev.webp` | Tata Nexon EV Empowered | EV | `07_tata_nexon_ev.jpg` | Demo image | Active (800x500 WebP) |
| 11| `mg-zs-ev.webp` | MG ZS EV Exclusive | EV | `11_mg_zs_ev.jpg` | Demo image | Active (800x500 WebP) |
| 12| `mercedes-c-class.webp`| Mercedes-Benz C-Class | Luxury | `12_mercedes_benz_c_class.jpg` | Demo image | Active (800x500 WebP) |

*(Note: Photo credit descriptions are dynamically displayed to users inside the vehicle's Quick View modal. All credits currently set to "Demo image".)*

