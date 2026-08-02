# Tool Demand Research — Thailand

สำรวจเมื่อ 2 สิงหาคม 2026 ด้วย Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search เพื่อใช้จัดลำดับเครื่องมือใหม่ คะแนนเป็นค่าความสนใจสัมพัทธ์ที่ Google ทำ normalization แล้ว ไม่ใช่จำนวนการค้นหาจริง และไม่ควรเปรียบเทียบคะแนนจากคนละกลุ่มเป็นค่าดิบโดยตรง

เอกสารอ้างอิง: [เปรียบเทียบคำค้นใน Google Trends](https://support.google.com/trends/answer/4359550) และ [คำถามที่พบบ่อยเกี่ยวกับข้อมูล Google Trends](https://support.google.com/trends/answer/4365533)

## ผลที่ใช้ตัดสินใจ

| กลุ่มเปรียบเทียบ | คำค้น | ค่าเฉลี่ย |
|---|---|---:|
| 1 | สร้าง qr code | 65 |
| 1 | คำนวณอายุ | 13 |
| 1 | ลดขนาดรูป | 5 |
| 1 | คำนวณเปอร์เซ็นต์ | 2 |
| 1 | คำนวณ vat | 1 |
| 2 | แปลง jpg เป็น pdf | 77 |
| 2 | สร้าง qr code | 26 |
| 2 | บีบอัด pdf | 13 |
| 2 | คำนวณอายุ | 5 |
| 2 | คำนวณ bmi | 3 |
| 3 | แปลง jpg เป็น pdf | 77 |
| 3 | ลบพื้นหลัง | 71 |
| 3 | สร้าง qr code | 26 |
| 3 | แปลง png เป็น jpg | 3 |
| 3 | ลดขนาดรูป | 2 |
| 4 | แปลง jpg เป็น pdf | 77 |
| 4 | สร้าง qr code | 26 |
| 4 | คำนวณภาษี | 8 |
| 4 | คำนวณเงินเดือน | 3 |
| 4 | คำนวณดอกเบี้ย | 3 |

## การตัดสินใจ

ส่งมอบ JPG to PDF, QR Code Generator และ Age Calculator ก่อน เพราะทำงานแบบ client-only ได้อย่างตรงไปตรงมา มีประโยชน์กับผู้ใช้หลายกลุ่ม และไม่ต้องส่งไฟล์หรือข้อมูลขึ้น Server

ยังไม่ส่งมอบ Background Remover แม้ความสนใจสูง เพราะต้องใช้โมเดล ML ขนาดใหญ่ และยังไม่ส่งมอบ PDF Compressor เพราะการลดขนาดให้ได้ผลจริงโดยไม่ทำลายคุณภาพเอกสารต้องมีการทดสอบและข้อจำกัดที่ชัดเจนกว่านี้

## รอบที่ 2 — เครื่องคำนวณที่คนไทยค้นหา

เปรียบเทียบใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search ภายในกลุ่มเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| คำนวณดอกเบี้ย | 72 |
| คำนวณ bmi | 57 |
| คำนวณกำไร | 27 |
| คำนวณ vat | 9 |
| คำนวณส่วนลด | 0 |

จึงส่งมอบ Loan Calculator, BMI Calculator และ Profit & Margin Calculator ก่อน VAT/ส่วนลด โดย Loan อ้างอิงหลักลดต้นลดดอกจาก [ธนาคารแห่งประเทศไทย](https://www.bot.or.th/th/satang-story/rights-responsibility/effectiverate.html) และ BMI ใช้สูตรกับช่วงอ้างอิงผู้ใหญ่จาก [องค์การอนามัยโลก](https://www.who.int/europe/news-room/fact-sheets/item/nutrition---maintaining-a-healthy-lifestyle)

## รอบที่ 3 — เครื่องมือรูปภาพสำหรับร้านค้าและงาน Content

เปรียบเทียบใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search ภายในกลุ่มเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| แปลง png เป็น jpg | 54 |
| ลดขนาดรูป | 35 |
| แปลง webp เป็น jpg | 17 |
| บีบอัดรูป | 16 |
| ครอปรูป | 11 |

จึงส่งมอบ PNG to JPG Converter ที่รองรับ PNG/WebP และ Image Compressor & Resizer ก่อนเครื่องมือครอปรูป ทั้งสองตัวทำงานด้วย Canvas ภายใน Browser จำกัดไฟล์ 10 MB ด้านยาว 8,000 พิกเซล และความละเอียดรวม 40 ล้านพิกเซลเพื่อลดความเสี่ยงด้านหน่วยความจำ

## รอบที่ 4 — ทบทวน Marketing/SEO และขยายไปยัง Popular Utilities

กลุ่ม Marketing/SEO เดิมมีสัญญาณต่ำเมื่อเทียบกับเครื่องมือที่ส่งมอบแล้วภายในกลุ่มเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| qr code generator | 59 |
| word counter | 5 |
| utm builder | 0 |
| meta tag generator | 0 |
| contrast checker | 0 |

จึงไม่ทำ UTM และ Meta Tag เพียงเพื่อเพิ่มจำนวนหน้า แต่ทดสอบกลุ่มเครื่องมือทั่วไปเพิ่มเติม พบผลภายในกลุ่มเดียวกันดังนี้:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| color picker | 30 |
| password generator | 27 |
| random number generator | 20 |
| character counter | 0 |
| text case converter | 0 |

จึงส่งมอบ Color Picker & Contrast Checker, Password Generator และ Random Number Generator โดย Color Picker รวมการตรวจ WCAG เพื่อให้มีคุณค่ามากกว่าการเลือกสีอย่างเดียว ส่วนเครื่องมือสุ่มทั้งสองใช้ Web Crypto และหลีกเลี่ยง modulo bias
