# Meaw Glass Design System

ชุด UI กลางของ Meaw Tools ใช้บรรยากาศคาเฟ่ญี่ปุ่นร่วมสมัย โดยให้ความน่ารักมาจากมาสคอต ภาพประกอบ และสีซากุระ/มัทฉะ ส่วนพื้นที่ทำงานยังคงอ่านง่ายและดูเป็นมืออาชีพ

## หลักการ

- Dark mode ใช้พื้นดำเกือบสนิท ไม่ใช้สีน้ำตาลเป็นพื้นหลัก
- ใช้ glass เฉพาะชั้นที่ช่วยบอกลำดับ ได้แก่ shell, overlay, workspace และ card
- ไม่ซ้อน blur ในทุก element เพื่อลด visual noise และภาระ GPU
- สีมัทฉะใช้กับ action/success สีซากุระใช้เป็น ambient accent ไม่ใช้แทนข้อความสำคัญ
- Input มีพื้นโปร่งแสงแยกจาก panel พร้อม border และ focus ring ที่มองเห็นชัด

## Design tokens

Tokens อยู่ใน `src/app/globals.css` และมีค่าทั้ง Light/Dark:

| Token | หน้าที่ |
|---|---|
| `--background` | สีพื้นหน้า; Dark เป็น near-black |
| `--matcha` / `--sakura` | สีเอกลักษณ์และ ambient accent |
| `--glass-surface` | ผิวกระจกหลักสำหรับ workspace/card |
| `--glass-surface-strong` | ผิวกระจกเข้มสำหรับ header/sidebar/overlay |
| `--glass-surface-subtle` | ผิวชั้นรองสำหรับ alert/tab/button |
| `--glass-border` / `--glass-highlight` | ขอบและแสงสะท้อนด้านใน |
| `--glass-shadow` | เงาหลักที่ปรับตาม theme |
| `--field-surface` | พื้น Input, Textarea และ Select |

## CSS components

| Class | ใช้กับ |
|---|---|
| `.meaw-shell-glass` | Header, sidebar, footer และ mobile toolbar |
| `.meaw-overlay-glass` | Sheet และ Select popover |
| `.meaw-glass` | Surface หลักที่ต้องกำหนดโครงเอง |
| `.meaw-glass-card` | Card และ FAQ |
| `.meaw-glass-subtle` | Alert, tabs และส่วนย่อย |
| `.meaw-workspace-panel` | กรอบทำงานหลักของทุกเครื่องมือ |
| `.meaw-field` | Input, Textarea และ Select trigger |
| `.meaw-button-glass` | ปุ่ม outline |
| `.meaw-glass-accent` | เส้นซากุระ–มัทฉะบน surface ที่เป็นจุดนำสายตา |

Shared components ใต้ `src/components/ui/` และ `src/components/layout/` ผูก class เหล่านี้ไว้แล้ว หน้าเครื่องมือใหม่จึงควรใช้ `Card`, `Input`, `Select`, `Alert`, `Button` และ `WorkspaceFrame` แทนการกำหนดค่า glass ซ้ำเอง

## Quality gates

- ตรวจ Light/Dark ที่ desktop 1440 px และ mobile 390 px
- Dark body ต้องมี RGB ทุกช่องไม่เกิน 20
- Shell และ workspace ต้องมี `backdrop-filter: blur(18px)` ใน Browser ที่รองรับ
- ห้ามมี horizontal overflow
- ระยะจาก label ถึง field อย่างน้อย 10 px
- Focus ring, contrast, drawer, popover และ console ต้องผ่าน E2E
