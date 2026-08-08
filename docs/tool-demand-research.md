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

## รอบที่ 5 — เครื่องมือคนไทยใช้ในห้องเรียน กิจกรรม และงานเอกสาร

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search และเปรียบเทียบคำในกลุ่มเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| วงล้อสุ่ม | 59 |
| พ.ศ. ค.ศ. | 35 |
| คำนวณเกรด | 2 |
| จับเวลาออนไลน์ | 1 |
| คำนวณ vat | 0 |

ผลกลุ่มย่อยยังพบว่า `วงล้อสุ่ม` สูงกว่า `สุ่มชื่อ`, `แบ่งกลุ่ม` และ `สุ่มกลุ่ม` อย่างชัดเจน ส่วนคำที่เกี่ยวข้องกับ `พ.ศ. ค.ศ.` มีคำถามตามปีปัจจุบัน เช่น “พ.ศ. 2569 ค.ศ. อะไร” และ “2026 พ.ศ. อะไร” เพิ่มขึ้นมาก จึงส่งมอบ Random Wheel และ Buddhist Year Converter ก่อน Batch ข้อมูลสำนักงานเดิม

ลิงก์ชุดเปรียบเทียบ: [Google Trends ประเทศไทย — วงล้อสุ่ม, คำนวณเกรด, พ.ศ. ค.ศ., VAT และจับเวลา](https://trends.google.com/trends/explore?geo=TH&date=today%2012-m&q=%E0%B8%A7%E0%B8%87%E0%B8%A5%E0%B9%89%E0%B8%AD%E0%B8%AA%E0%B8%B8%E0%B9%88%E0%B8%A1,%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94,%E0%B8%9E.%E0%B8%A8.%20%E0%B8%84.%E0%B8%A8.,%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%20vat,%E0%B8%88%E0%B8%B1%E0%B8%9A%E0%B9%80%E0%B8%A7%E0%B8%A5%E0%B8%B2%E0%B8%AD%E0%B8%AD%E0%B8%99%E0%B9%84%E0%B8%A5%E0%B8%99%E0%B9%8C)

## รอบที่ 6 — ทบทวนเครื่องมือภาพด้วย Anchor ที่ส่งมอบแล้ว

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search และเปรียบเทียบคำในกลุ่มเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| ลบพื้นหลัง | 60 |
| วงล้อสุ่ม | 59 |
| แปลงรูปเป็นข้อความ | 1 |
| ทำรูปติดบัตร | 1 |
| ครอปรูป | 1 |

`ลบพื้นหลัง` มีความสนใจระดับเดียวกับ `วงล้อสุ่ม` ซึ่งเป็นเครื่องมือที่ส่งมอบแล้ว และสูงกว่าตัวเลือกภาพอื่นในชุดเดียวกันอย่างชัดเจน จึงทบทวนข้อจำกัดเดิมและส่งมอบ Background Remover หลังพบแนวทางที่คุม performance และ license ได้: โหลด ONNX Runtime Web เฉพาะ route นี้เมื่อผู้ใช้กดประมวลผล ใช้โมเดล U-2-Netp ขนาด 4.58 MB โดย Runtime ใช้ MIT และโมเดลระบุ Apache-2.0 รูปประมวลผลใน Browser ส่วน AI Runtime และโมเดลรวมประมาณ 15–20 MB ในครั้งแรกและ Browser cache ไว้สำหรับครั้งถัดไป

ข้อจำกัดที่เปิดเผยใน UI คือโมเดลขนาดเล็กอาจพลาดขอบผม ขน เงา กระจก วัตถุโปร่งใส และฉากซับซ้อน เครื่องมือนี้จึงให้ผู้ใช้ตรวจผลบนพื้นโปร่งใส ขาว และชมพูก่อนดาวน์โหลด ไม่กล่าวอ้างว่าแม่นยำทุกภาพ

ลิงก์ชุดเปรียบเทียบ: [Google Trends ประเทศไทย — วงล้อสุ่ม, ลบพื้นหลัง, OCR, รูปติดบัตร และครอปรูป](https://trends.google.com/trends/explore?geo=TH&date=today%2012-m&q=%E0%B8%A7%E0%B8%87%E0%B8%A5%E0%B9%89%E0%B8%AD%E0%B8%AA%E0%B8%B8%E0%B9%88%E0%B8%A1,%E0%B8%A5%E0%B8%9A%E0%B8%9E%E0%B8%B7%E0%B9%89%E0%B8%99%E0%B8%AB%E0%B8%A5%E0%B8%B1%E0%B8%87,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1,%E0%B8%97%E0%B8%B3%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%9A%E0%B8%B1%E0%B8%95%E0%B8%A3,%E0%B8%84%E0%B8%A3%E0%B8%AD%E0%B8%9B%E0%B8%A3%E0%B8%B9%E0%B8%9B)

## รอบที่ 7 — Typing Test และเครื่องมือที่ทำได้จริงใน Browser

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search โดยเริ่มจาก candidate ข้ามสายงาน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| typing test | 69 |
| jpg to png | 32 |
| webp to jpg | 21 |
| qr code scanner | 8 |
| pomodoro timer | 1 |

เมื่อเจาะ intent การฝึกพิมพ์ภาษาไทย พบ `พิมพ์ดีด` 63, `ฝึกพิมพ์` 39, `พิมพ์สัมผัส` 12, `เกมพิมพ์ดีด` 5 และ `ฝึกพิมพ์ภาษาไทย` 4 ในชุดเดียวกัน ส่วนชุดอังกฤษ/ไทยพบ `ฝึกพิมพ์ดีด` 56 และ `typing test` 44 สูงกว่าคำเฉพาะอย่าง `typing speed test` 1 และ `wpm test` 0

จึงส่งมอบ Typing Test ภาษาไทย/อังกฤษก่อนเครื่องมือแปลง Word/PDF แม้ `word to pdf` และ `pdf to word` มีค่าเฉลี่ย 28 และ 27 ในชุดเอกสาร เพราะการแปลงไฟล์ Office ให้คง layout, ฟอนต์, ตาราง และองค์ประกอบทุกชนิดอย่างน่าเชื่อถือยังทำแบบ client-only ได้ไม่สม่ำเสมอ เครื่องมือ Typing Test ใช้ grapheme segmentation สำหรับสระ/วรรณยุกต์ไทย แสดงสูตร WPM/CPM อย่างโปร่งใส และไม่เก็บข้อความหรือผลทดสอบ

- [Google Trends — Typing Test, JPG/PNG, WebP, Pomodoro และ QR Scanner](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=webp%20to%20jpg,jpg%20to%20png,typing%20test,pomodoro%20timer,qr%20code%20scanner)
- [Google Trends — คำค้นการฝึกพิมพ์ภาษาไทย](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C%E0%B8%94%E0%B8%B5%E0%B8%94,%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C,%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C%E0%B8%AA%E0%B8%B1%E0%B8%A1%E0%B8%9C%E0%B8%B1%E0%B8%AA,%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C%E0%B8%A0%E0%B8%B2%E0%B8%A9%E0%B8%B2%E0%B9%84%E0%B8%97%E0%B8%A2,%E0%B9%80%E0%B8%81%E0%B8%A1%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C%E0%B8%94%E0%B8%B5%E0%B8%94)

## รอบที่ 8 — อักษรพิเศษ สัญลักษณ์ และเครื่องมือแต่งชื่อ

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search โดยเทียบ candidate ข้าม backlog ในชุดเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| ตัวอักษรพิเศษ | 75 |
| jpg to png | 8 |
| emoji copy | 4 |
| qr code scanner | 2 |
| csv cleaner | 0 |

ชุดเจาะ intent พบ `อักษรพิเศษ` 76, `ตัวอักษรพิเศษ` 24, `สัญลักษณ์พิเศษ` 6, `ตัวอักษรพิเศษภาษาอังกฤษ` 2 และ `ฟอนต์ตัวอักษรพิเศษ` 0 ค่าแต่ละชุดเป็นดัชนีสัมพัทธ์ จึงไม่ควรนำเลขจากคนละชุดมาเปรียบเทียบตรง ๆ แต่ทั้งสองชุดยืนยันว่าคำหลักมีสัญญาณสม่ำเสมอและสูงกว่า candidate ที่เหลือเมื่อเทียบโดยตรง

Related Queries ระบุ intent ที่ทำเป็น action ได้ เช่น รูปยิ้ม ปีกนางฟ้า คิตตี้ เลขโรมัน อักษร iPhone และข้อความเทศกาล จึงส่งมอบมากกว่าหน้า Symbol Copy: มีข้อความ Unicode 9 สไตล์ กรอบแต่งชื่อที่รองรับภาษาไทย ค้นหาด้วยคำไทย หมวดเฉพาะ และประวัติคัดลอกชั่วคราว พร้อมเปิดเผยว่า Unicode แต่ละชุดอาจแสดงต่างกันและไม่เหมาะแทนข้อความปกติในข้อมูลสำคัญ

- [Google Trends — อักษรพิเศษเทียบ Image, Emoji, QR และ CSV](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=jpg%20to%20png,emoji%20copy,%E0%B8%95%E0%B8%B1%E0%B8%A7%E0%B8%AD%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%A3%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9,qr%20code%20scanner,csv%20cleaner)
- [Google Trends — เจาะคำค้นอักษรและสัญลักษณ์พิเศษ](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B8%95%E0%B8%B1%E0%B8%A7%E0%B8%AD%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%A3%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9,%E0%B8%9F%E0%B8%AD%E0%B8%99%E0%B8%95%E0%B9%8C%E0%B8%95%E0%B8%B1%E0%B8%A7%E0%B8%AD%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%A3%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9,%E0%B8%AA%E0%B8%B1%E0%B8%8D%E0%B8%A5%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%93%E0%B9%8C%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9,%E0%B8%AD%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%A3%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9,%E0%B8%95%E0%B8%B1%E0%B8%A7%E0%B8%AD%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%A3%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9%E0%B8%A0%E0%B8%B2%E0%B8%A9%E0%B8%B2%E0%B8%AD%E0%B8%B1%E0%B8%87%E0%B8%81%E0%B8%A4%E0%B8%A9)

## รอบที่ 9 — QR Code Scanner เทียบเครื่องมือแปลงรูป

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search ชุดคำไทยให้ค่าเฉลี่ยดังนี้:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| สแกน qr code | 74 |
| แปลงรูปเป็น jpg | 42 |
| แปลง jpg เป็น png | 41 |
| ลดขนาดรูป | 26 |
| อ่าน qr code | 12 |

ชุดภาษาอังกฤษ/คำเครื่องมือพบ `jpg to png` 64, `resize image` 44, `webp to jpg` 42, `qr scanner` 29 และ `qr code scanner` 16 ในชุดเดียวกัน ส่วนชุดเจาะ intent พบ `qr code reader` 14 และ Related Queries ของคำนี้มี `qr code reader for pc` เป็น Breakout กับ `qr code reader from image` เพิ่ม 350% คำยาวอย่าง `qr code scanner online` และคำไทย “จากรูป” มีข้อมูลน้อย จึงไม่ตีความว่าไม่มีความต้องการ

ตัดสินใจส่งมอบ QR Code Scanner เพราะมีสัญญาณภาษาไทยสูง มี action ใหม่จาก QR Generator ที่มีอยู่ และทำแบบฟรี client-only ได้จริง ขอบเขตคืออ่าน PNG/JPG/WebP ไม่เกิน 10 MB หรือกล้อง โหลด decoder เมื่อเริ่มใช้ หยุดกล้องเมื่ออ่านสำเร็จ ไม่เปิด URL อัตโนมัติ และแสดง hostname ก่อนให้ผู้ใช้เปิดเอง ทั้งนี้ Google Trends เป็นดัชนีสัมพัทธ์ ไม่ใช่จำนวนค้นหาจริง

- [Google Trends — JPG, WebP, QR Scanner และ Resize Image](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=jpg%20to%20png,webp%20to%20jpg,qr%20code%20scanner,qr%20scanner,resize%20image)
- [Google Trends — คำไทยแปลงรูปและสแกน QR](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20jpg,%E0%B8%A5%E0%B8%94%E0%B8%82%E0%B8%99%E0%B8%B2%E0%B8%94%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B8%AA%E0%B9%81%E0%B8%81%E0%B8%99%20qr%20code,%E0%B8%AD%E0%B9%88%E0%B8%B2%E0%B8%99%20qr%20code)
- [Google Trends — QR Reader Online และจากรูป](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=qr%20code%20reader,qr%20code%20scanner%20online,scan%20qr%20code%20online,%E0%B8%AA%E0%B9%81%E0%B8%81%E0%B8%99%20qr%20code%20%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B8%AD%E0%B9%88%E0%B8%B2%E0%B8%99%20qr%20code%20%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B9%E0%B8%9B)

## รอบที่ 10 — Image to Text OCR เทียบเครื่องมือรูปและข้อมูล

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search ชุดภาษาอังกฤษพบ:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| jpg to png | 64 |
| image to text | 56 |
| csv cleaner | 0 |
| add watermark to photo | 0 |
| passport photo maker | 0 |

ชุดภาษาไทยพบ `แปลงรูปเป็นข้อความ` 52 สูงกว่า `แปลงรูปเป็น png` 41, `ทำรูปติดบัตร` 33, `ลบข้อมูลซ้ำ excel` 1 และ `ใส่ลายน้ำรูป` 1 เมื่อเจาะคำ OCR เพิ่มในชุดเดียวกัน พบ `แปลงรูปเป็นข้อความ` 52, `ocr ไทย` 5, `อ่านข้อความจากรูป` 2, `คัดลอกข้อความจากรูป` 1 และ `ดึงข้อความจากรูป` 0 คำที่ข้อมูลต่ำไม่ได้แปลว่าไม่มีผู้ใช้ แต่คำหลัก “แปลงรูปเป็นข้อความ” ให้ intent ตรงและสม่ำเสมอกว่า

จึงส่งมอบ Image to Text OCR ก่อน Batch Image Converter ซึ่งบางส่วนซ้ำกับ PNG/WebP to JPG ที่มีอยู่ ขอบเขตใหม่รองรับรูป PNG/JPG/WebP ภาษาไทย อังกฤษ หรือทั้งสองภาษา ปรับรูปขาวดำ/Contrast ได้ แก้ผลลัพธ์ก่อนคัดลอกหรือดาวน์โหลด และ self-host Tesseract.js WebAssembly กับโมเดลภาษาโดยไม่ส่งรูปออกจาก Browser ครั้งแรกดาวน์โหลดสินทรัพย์ที่ใช้งานจริงประมาณ 8 MB และ Worker ถูกปิดหลังจบงาน ทั้งนี้ไม่รองรับ PDF/ลายมือและต้องตรวจผล OCR กับต้นฉบับ

- [Google Trends — Image to Text เทียบ JPG/PNG, CSV, Watermark และ Passport Photo](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=jpg%20to%20png,image%20to%20text,csv%20cleaner,add%20watermark%20to%20photo,passport%20photo%20maker)
- [Google Trends — แปลงรูปเป็นข้อความเทียบเครื่องมือรูปและ Excel](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1,%E0%B8%A5%E0%B8%9A%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5%E0%B8%8B%E0%B9%89%E0%B8%B3%20excel,%E0%B9%83%E0%B8%AA%E0%B9%88%E0%B8%A5%E0%B8%B2%E0%B8%A2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B8%97%E0%B8%B3%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%9A%E0%B8%B1%E0%B8%95%E0%B8%A3)
- [Google Trends — เจาะ Intent OCR ภาษาไทย](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B8%84%E0%B8%B1%E0%B8%94%E0%B8%A5%E0%B8%AD%E0%B8%81%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1,%E0%B8%AD%E0%B9%88%E0%B8%B2%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B8%94%E0%B8%B6%E0%B8%87%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B9%E0%B8%9B,ocr%20%E0%B9%84%E0%B8%97%E0%B8%A2)

## รอบที่ 11 — Text to Speech เทียบ Batch Converter และเครื่องมือสำนักงาน

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search เริ่มจากกลุ่มรูปภาพ พบ `แปลง jpg เป็น png` เฉลี่ย 61 สูงกว่า `แปลงรูปเป็น png` 21, `ทำรูปติดบัตร` 17, `ครอปรูป` 13 และ `ใส่ลายน้ำรูป` 0 จึงใช้คำแรกเป็น Anchor เทียบเครื่องมือสำนักงานต่อ

ชุดสำนักงานพบ `แปลงข้อความเป็นเสียง` 60, `แปลง jpg เป็น png` 55, `คำนวณเกรด` 37, `สร้างบาร์โค้ด` 37 และ `เครื่องคิดเลขค่าไฟ` 0 เมื่อเจาะ intent เสียงในชุดเดียวกัน พบ `อ่านข้อความ` 64, `text to speech` 43, `แปลงข้อความเป็นเสียง` 24, `แปลง jpg เป็น png` 22 และ `เสียงอ่านข้อความ` 6 ส่วนชุดคำอังกฤษพบ `text to speech` 69 สูงกว่า `jpg to png` 35, `countdown timer` 13, `barcode generator` 8 และ `photo collage` 8

จึงเลื่อน Image Format Batch Converter ไป Batch ถัดไปและส่งมอบ Text to Speech Reader ก่อน ขอบเขตใช้ Web Speech API ที่มีใน Browser/ระบบ รองรับไทยและอังกฤษ เลือกเสียง ความเร็ว ระดับเสียง และความดัง แบ่งข้อความยาวเป็นช่วง พัก อ่านต่อ และหยุดได้ จำกัด 20,000 ตัวอักษร และไม่อ้างว่าสร้าง MP3 ได้ Meaw Tools ไม่รับข้อความเข้าฝั่ง Server แต่เสียงออนไลน์บางรายการอาจประมวลผลกับผู้ให้บริการของ Browser หรือระบบปฏิบัติการ จึงแสดงคำเตือนเรื่องข้อมูลลับอย่างชัดเจน

Batch 21 ส่งมอบช่องว่างที่เหลือเป็นหน้า `JPG to PNG Batch Converter` โดยใช้คำหลักตรงกับ intent `แปลง jpg เป็น png` และ `jpg to png` แต่เพิ่มงานจริงที่เครื่องมือเดิมยังไม่มี: เลือกหลายไฟล์ JPG/PNG/WebP, ส่งออกทั้งชุดเป็น PNG/WebP/JPG, จำกัดทรัพยากร, ประมวลผลทีละรูป และดาวน์โหลด ZIP ภายใน Browser หน้าใหม่นี้ไม่แทนที่ `PNG to JPG` แบบไฟล์เดียวหรือ `Image Compressor & Resizer` ที่เน้นควบคุมขนาดภาพอย่างละเอียด

- [Google Trends — JPG/PNG, รูปติดบัตร, ลายน้ำ และครอปรูป](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B8%97%E0%B8%B3%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%9A%E0%B8%B1%E0%B8%95%E0%B8%A3,%E0%B9%83%E0%B8%AA%E0%B9%88%E0%B8%A5%E0%B8%B2%E0%B8%A2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B8%84%E0%B8%A3%E0%B8%AD%E0%B8%9B%E0%B8%A3%E0%B8%B9%E0%B8%9B)
- [Google Trends — Text to Speech เทียบเครื่องมือสำนักงาน](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94,%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%84%E0%B8%B4%E0%B8%94%E0%B9%80%E0%B8%A5%E0%B8%82%E0%B8%84%E0%B9%88%E0%B8%B2%E0%B9%84%E0%B8%9F,%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%9A%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B9%82%E0%B8%84%E0%B9%89%E0%B8%94,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B9%80%E0%B8%AA%E0%B8%B5%E0%B8%A2%E0%B8%87)
- [Google Trends — เจาะ Intent อ่านข้อความและเสียง](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B9%80%E0%B8%AA%E0%B8%B5%E0%B8%A2%E0%B8%87,text%20to%20speech,%E0%B8%AD%E0%B9%88%E0%B8%B2%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1,%E0%B9%80%E0%B8%AA%E0%B8%B5%E0%B8%A2%E0%B8%87%E0%B8%AD%E0%B9%88%E0%B8%B2%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png)
- [Google Trends — คำอังกฤษ Text to Speech เทียบ Tools อื่น](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=jpg%20to%20png,barcode%20generator,text%20to%20speech,countdown%20timer,photo%20collage)

## รอบที่ 12 — Barcode Generator เทียบ Grade Calculator

สำรวจต่อเมื่อ 3 สิงหาคม 2026 โดยใช้หลักฐาน Google Trends ประเทศไทยช่วง 12 เดือนจากรอบที่ 11 ซึ่ง `สร้างบาร์โค้ด` และ `คำนวณเกรด` มีค่าเฉลี่ยเท่ากันที่ 37 ในชุดเปรียบเทียบเดียวกัน จึงไม่ใช้ตัวเลขนี้ตัดสินเพียงอย่างเดียว และเจาะคำแนะนำการค้นหาปัจจุบันจาก Google Autocomplete เพิ่ม:

| คำตั้งต้น | ตัวอย่างคำแนะนำที่พบ |
|---|---|
| สร้างบาร์โค้ด | สร้างบาร์โค้ดฟรี, 13 หลัก, Excel, สินค้า, ออนไลน์, Code 128, 14 หลัก |
| barcode generator | free, EAN-13, vector, SVG, online, Code 128, ITF-14, Excel |
| คำนวณเกรด | เกรดเฉลี่ย, มหาลัย, 5 เทอม, GPAX, เกรดเฉลี่ยสะสม |
| คำนวณเกรดเฉลี่ย | สะสม, มหาลัย, รวม, 2/4/5/6 เทอม, GPAX |

ทั้งสองกลุ่มมี intent จริง แต่ Barcode ครอบคลุมหลายสายงานกว่า ทั้งร้านค้า คลังสินค้า โลจิสติกส์ งานพิมพ์ และนักพัฒนา และมี action ที่ทำฟรีใน Browser ได้ครบกว่า จึงส่งมอบ `Barcode Generator` ก่อน แล้วเก็บ Grade Calculator เป็นผู้สมัคร Batch 23 ขอบเขตรองรับ Code 128, EAN-13, EAN-8, UPC-A, ITF-14 และ Code 39 วางหนึ่งคอลัมน์จาก Excel ได้สูงสุด 50 รายการ เติมหรือตรวจ Check Digit และดาวน์โหลด PNG/SVG/ZIP

ใช้ `jsbarcode` 3.12.3 แบบ dynamic import เฉพาะเมื่อกดสร้าง ไม่มี CDN ภายนอก และใช้ `fflate` เฉพาะเมื่อดาวน์โหลด ZIP หน้าเครื่องมือแยกชัดเจนว่าการสร้างภาพ EAN/UPC ไม่ได้จดทะเบียน GTIN: สินค้าจริงต้องใช้เลขหมายตามกระบวนการ GS1 และควรสแกนทดสอบบนงานพิมพ์จริง Google Trends และ Autocomplete เป็นสัญญาณความสนใจ/intent ไม่ใช่จำนวนค้นหารายเดือน จึงต้องยืนยันผลหลังเปิดตัวด้วย Search Console

- [Google Trends — Text to Speech เทียบ Barcode, Grade และ JPG to PNG](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94,%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%84%E0%B8%B4%E0%B8%94%E0%B9%80%E0%B8%A5%E0%B8%82%E0%B8%84%E0%B9%88%E0%B8%B2%E0%B9%84%E0%B8%9F,%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%9A%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B9%82%E0%B8%84%E0%B9%89%E0%B8%94,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B9%80%E0%B8%AA%E0%B8%B5%E0%B8%A2%E0%B8%87)
- [Google Autocomplete — สร้างบาร์โค้ด](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%9A%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B9%82%E0%B8%84%E0%B9%89%E0%B8%94)
- [Google Autocomplete — Barcode Generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=barcode%20generator)
- [Google Autocomplete — คำนวณเกรด](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94)
- [JsBarcode — รูปแบบและ API ที่รองรับ](https://github.com/lindell/JsBarcode)
- [GS1 Thailand — สมัครและจัดการเลขหมาย GTIN](https://gs1th.org/get-a-barcode/)

## รอบที่ 13 — Grade Calculator และ intent นักเรียน/นักศึกษา

สำรวจต่อเมื่อ 3 สิงหาคม 2026 จากหลักฐาน Trends ชุดเดียวกับรอบ 11–12 ซึ่ง `คำนวณเกรด` มีค่าเฉลี่ย 37 และตรวจ Google Autocomplete ปัจจุบันซ้ำเพื่อแยกงานจริง:

| คำตั้งต้น | คำแนะนำหลักที่พบ |
|---|---|
| คำนวณเกรด | เกรดเฉลี่ย, มหาลัย, 5 เทอม, GPAX, เกรดเฉลี่ยสะสม, 4 เทอม, เกรดรวม |
| คำนวณเกรดเฉลี่ย | สะสม, มหาลัย, รวม, 2/4/5/6 เทอม, GPAX |
| คำนวณ GPA | GPAX, มหาลัย, รายวิชา, 4/5/6 เทอม, รวม |
| เครื่องคิดเลขค่าไฟ | ไม่มีคำแนะนำในรอบนี้ |
| คำนวณโอที | 1.5 เท่า, รายวัน, วันหยุด, วันอาทิตย์, 2/3 เท่า, Excel |
| csv to excel | converter, online, free, file, columns |

Grade Calculator จึงมี intent ทั้งระดับรายวิชาและหลายภาคเรียนที่ทำฟรีใน Browser ได้ครบโดยไม่อาศัยข้อมูลกฎหมายหรือ API ภายนอก ส่วน Overtime มี long-tail จริงแต่ต้องตรวจฐานกฎหมายและประเภทการจ้างปัจจุบันก่อนจึงเลื่อนไปวิจัย Batch 24 ขณะที่ CSV to Excel เป็นผู้สมัคร low-risk อีกตัวที่ต้องเทียบ Trends ภาษาอังกฤษเพิ่ม

ขอบเขตที่ส่งมอบมีสองโหมด: (1) GPA รายภาคจากหน่วยกิต × แต้ม A, B+, B, C+, C, D+, D, F โดย F นับแต้ม 0 และ W/S/U ไม่นับ และ (2) ประมาณ GPAX จาก GPA กับหน่วยกิตของ 2–20 ภาคเรียนแบบถ่วงน้ำหนัก ไม่ใช้ค่าเฉลี่ยธรรมดา คู่มือมหาวิทยาลัยแม่ฟ้าหลวงยืนยันสูตรคะแนนรวม ÷ หน่วยกิตรวมและตัวอย่าง 45 ÷ 19 = 2.36 ในเอกสาร รวมทั้งแสดง W/S/U ว่าไม่นำมาคำนวณ เครื่องมือแสดงค่าละเอียด ค่าปัด 2 ตำแหน่ง และค่าตัด 2 ตำแหน่งควบคู่กัน เพราะข้อกำหนดการแสดงผลอาจต่างกัน และระบุว่า GPAX จาก GPA รายเทอมเป็นเพียงค่าประมาณหากค่าต้นทางถูกปัดมาแล้ว

Google Trends เป็นข้อมูลความสนใจสัมพัทธ์ที่ถูก normalize ไม่ใช่จำนวนค้นหารายเดือน จึงต้องติดตาม impressions, queries และ CTR จริงหลังเปิดตัวผ่าน Search Console ก่อนสรุปผลเชิงรายได้

- [Google Autocomplete — คำนวณเกรด](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94)
- [Google Autocomplete — คำนวณเกรดเฉลี่ย](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94%E0%B9%80%E0%B8%89%E0%B8%A5%E0%B8%B5%E0%B9%88%E0%B8%A2)
- [Google Autocomplete — คำนวณ GPA](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%20GPA)
- [Google Trends — ชุดเปรียบเทียบเครื่องมือสำนักงานประเทศไทย](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94,%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%84%E0%B8%B4%E0%B8%94%E0%B9%80%E0%B8%A5%E0%B8%82%E0%B8%84%E0%B9%88%E0%B8%B2%E0%B9%84%E0%B8%9F,%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%9A%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B9%82%E0%B8%84%E0%B9%89%E0%B8%94,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B9%80%E0%B8%AA%E0%B8%B5%E0%B8%A2%E0%B8%87)
- [มหาวิทยาลัยแม่ฟ้าหลวง — วิธีคำนวณ GPA และ GPAX](https://reg.mfu.ac.th/backend/api/files/media_library/CAL_2022-09-07%2013%3A40%3A41.809577.pdf)
- [Google Trends Help — ข้อมูล Trends เป็นค่าความสนใจสัมพัทธ์](https://support.google.com/trends/answer/4365533?hl=en)

## รอบที่ 14 — CSV to Excel และ intent งานสำนักงานหลายสาย

สำรวจต่อเมื่อ 3 สิงหาคม 2026 โดยตรวจ Google Autocomplete ปัจจุบันของผู้สมัคร Batch 24 และพยายามเปิด Google Trends Explore ชุดเปรียบเทียบประเทศไทย 12 เดือน แต่ได้รับ HTTP 429 จึงไม่สร้างหรืออ้างตัวเลข Trends ใหม่จากรอบนี้ การตัดสินใจใช้ intent เชิงคุณภาพจาก Autocomplete ร่วมกับความกว้างของกลุ่มผู้ใช้ ความเสี่ยงข้อมูล และความสามารถในการทำงานจริงใน Browser:

| คำตั้งต้น | คำแนะนำหลักที่พบ |
|---|---|
| csv to excel | converter, online, converter online, free, table, convert, file, columns |
| convert csv to excel | online, online free, free, Power Automate, table, columns, automatically, Python, Mac |
| csv cleaner | online, tool, AI, Python, data cleaner, duplicate cleaner |
| คำนวณ OT / คำนวณโอที | 1.5 เท่า, ฐานเงินเดือน, รายวัน, ออนไลน์, วันหยุด, 2/3 เท่า, Excel |
| คำนวณวันทำงาน / นับวันทำงาน | ราชการ, ออนไลน์, Excel, 119 วัน |
| คำนวณเกรดที่ต้องได้ / วางแผนเกรด | ไม่พบคำแนะนำในรอบนี้; `target gpa calculator` มีคำแนะนำภาษาอังกฤษแต่เน้นชื่อสถาบันต่างประเทศ |

CSV to Excel จึงชนะผู้สมัคร low-risk ในรอบนี้เพราะมี action ชัดเจนและใช้ได้กับสำนักงาน บัญชี ฝ่ายขาย โลจิสติกส์ นักวิเคราะห์ และนักพัฒนา ส่วน OT มี long-tail ภาษาไทยแข็งแรงกว่าแต่ต้องแยกประเภทลูกจ้าง วันทำงาน วันหยุด และตรวจฐานกฎหมายล่าสุดก่อนพัฒนา Workday มี intent จริงแต่แคบกว่า และ Target GPA ภาษาไทยยังไม่เห็นสัญญาณแยกจาก Grade Calculator เดิมเพียงพอ

ขอบเขตที่ส่งมอบคืออ่านไฟล์ CSV/TSV/TXT หรือข้อความที่วาง รองรับ comma/tab/semicolon/pipe, UTF-8 และ Windows-874, quoted fields, escaped quote และ multiline field ตรวจ Preview/แถวผิดรูปใน Web Worker แล้วสร้าง .xlsx หนึ่ง Worksheet พร้อมหัวตาราง Filter และ freeze row ตัวเลขที่ปลอดภัยถูกเขียนเป็นเซลล์ตัวเลข แต่รหัสที่มีเลขศูนย์นำหน้าและค่าที่อาจเป็น Formula Injection ถูกเก็บเป็น inline string ไม่สร้างสูตรจาก input จำกัด 10 MB, 50,000 แถว, 200 คอลัมน์ และ 500,000 เซลล์เพื่อคุม RAM และเวลาบนอุปกรณ์พกพา

Microsoft ระบุว่าไฟล์ข้อความแบบ delimited ใช้ tab ได้และ CSV ใช้ comma โดยตัวคั่นสามารถเปลี่ยนได้ อีกทั้ง Excel รองรับสูงสุด 1,048,576 แถว × 16,384 คอลัมน์ แต่เครื่องมือ Browser ใช้เพดานต่ำกว่ามากเพื่อความเสถียร RFC 4180 ใช้เป็นฐานสำหรับ comma, quote, quote ซ้อน และ newline ใน quoted field ส่วนคะแนน Trends ต้องตีความเป็นค่าความสนใจสัมพัทธ์ ไม่ใช่จำนวนค้นหารายเดือน

- [Google Autocomplete — csv to excel](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=csv%20to%20excel)
- [Google Autocomplete — convert csv to excel](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=convert%20csv%20to%20excel)
- [Google Autocomplete — คำนวณ OT](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%20ot)
- [Google Autocomplete — คำนวณวันทำงาน](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%A7%E0%B8%B1%E0%B8%99%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B2%E0%B8%99)
- [RFC 4180 — Common Format and MIME Type for CSV](https://www.rfc-editor.org/info/rfc4180/)

- [Microsoft — Import or export text and CSV files](https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files)
- [Microsoft — Excel specifications and limits](https://support.microsoft.com/en-us/excel/excel-specifications-and-limits)
- [Google Trends Help — ข้อมูล Trends เป็นค่าความสนใจสัมพัทธ์](https://support.google.com/trends/answer/4365533?hl=en)

## รอบที่ 15 — UTM Builder และเครื่องมือข้ามสายงาน

สำรวจต่อเมื่อ 8 สิงหาคม 2026 โดยตรวจ Google Autocomplete ปัจจุบัน 16 คำตั้งต้น แล้วคัด 12 แนวคิดที่ไม่ซ้ำ catalog มากเกินไป Google Trends Explore ชุดประเทศไทย 12 เดือนตอบ HTTP 429 อีกครั้ง จึงไม่อ้างตัวเลข Trends ใหม่และไม่ตีความจำนวนคำแนะนำเป็น search volume; ใช้ Autocomplete เป็นหลักฐานว่ามี long-tail intent เท่านั้น แล้วจัดอันดับร่วมกับความกว้างของผู้ใช้ ความเสี่ยง ความสามารถในการทำงานฟรีใน Browser โอกาส SEO/AdSense และการขยายผลิตภัณฑ์

คะแนน 5 คือสูงที่สุด ส่วน Demand แสดงจำนวนคำแนะนำสูงสุด 10 รายการจาก endpoint ที่ตรวจในรอบนี้:

| อันดับ | แนวคิด | Autocomplete | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | UTM Link Builder | 10 | 2 | 5 | 5 | 5 | 3 | ชนะ: เปิดกลุ่มนักการตลาด/เจ้าของร้าน มีข้อกำหนด GA4 ทางการ และ client-only ได้ครบ |
| 2 | CSV Cleaner + Duplicate Finder | 8 | 3 | 5 | 4 | 5 | 3 | คุณค่าสูงและ reuse CSV parser ได้ แต่ต่อจาก Batch 24 จะกระจุกในกลุ่มข้อมูลเกินไป |
| 3 | JSON to CSV Converter | 10 | 2 | 4 | 4 | 5 | 2 | intent กว้าง แต่ทับกับ JSON/CSV tools เดิมและต้องออกแบบ nested data ให้โปร่งใส |
| 4 | Markdown Table Generator | 10 | 2 | 4 | 4 | 4 | 2 | feasible และเหมาะ developer/content แต่กลุ่มผู้ใช้แคบกว่า UTM |
| 5 | Excel to CSV Converter | 10 | 3 | 4 | 4 | 5 | 2 | มี intent ชัด แต่ต้องเพิ่ม parser XLSX และนโยบายหลาย Worksheet |
| 6 | Overtime Calculator | 10 | 4 | 5 | 5 | 4 | 3 | long-tail ไทยแข็งแรง แต่ต้อง version กฎหมายและแยกประเภทลูกจ้าง/วันทำงานก่อน |
| 7 | Business Days Calculator | 10 | 3 | 4 | 4 | 4 | 3 | intent อังกฤษกว้างแต่คำแนะนำผูกประเทศ ต้องมีชุดวันหยุดไทยแบบ versioned |
| 8 | Online Signature Maker | 10 | 3 | 4 | 4 | 4 | 3 | demand กว้าง แต่ทับกับ Sign PDF และต้องสื่อว่าไม่ใช่ digital certificate |
| 9 | Invoice Number Generator | 10 | 2 | 3 | 4 | 3 | 2 | ทำง่ายแต่เลขที่เอกสารควรผูกระบบบัญชี/ลำดับจริง ไม่ควรสุ่มโดยไม่มีบริบท |
| 10 | CSV Duplicate Remover | 7 | 2 | 4 | 4 | 4 | 2 | intent เฉพาะดี แต่ควรรวมใน CSV Cleaner แทนการแยกหน้าบางเกินไป |
| 11 | Remove Duplicate Rows Online | 3 | 2 | 3 | 3 | 3 | 2 | intent แคบและซ้ำ Text Cleaner/CSV Cleaner |
| 12 | Excel Duplicate Remover Online | 1 | 3 | 3 | 3 | 3 | 2 | สัญญาณอ่อนสุดในชุดและต้องเพิ่ม XLSX parser |

UTM Link Builder จึงถูกเลือกเพื่อเพิ่มเครื่องมือสายการตลาดโดยไม่เพิ่ม backend หรือค่า API เครื่องมือบังคับ `utm_source`, `utm_medium`, `utm_campaign`, รองรับ `utm_id`, `utm_source_platform`, `utm_term`, `utm_content`, รักษา query/hash เดิม แทน UTM เดิมโดยไม่สร้างค่าซ้ำ นำ URL ที่ติด UTM กลับมาแก้ไขได้ และเปิด lowercase/underscore เป็นค่าเริ่มต้นเพื่อลดข้อมูลแตกแถว

Google Analytics ระบุว่าค่า UTM แยกตัวพิมพ์เล็ก-ใหญ่ แนะนำ naming convention ที่สม่ำเสมอ และควรใช้ source/medium/campaign ให้ครบ ขณะเดียวกันการใส่ manual campaign values ร่วมกับ Google Click ID อาจทำให้ attribution ผิด จึงต้องแสดงคำเตือน Google Ads auto-tagging อย่างชัดเจนแทนการบอกให้ติด UTM ทุกลิงก์

- [Google Autocomplete — utm builder](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=utm%20builder)
- [Google Autocomplete — utm link builder](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=utm%20link%20builder)
- [Google Autocomplete — csv cleaner](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=csv%20cleaner)
- [Google Autocomplete — json to csv converter](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=json%20to%20csv%20converter)
- [Google Autocomplete — markdown table generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=markdown%20table%20generator)
- [Google Analytics Help — Collect campaign data with custom URLs](https://support.google.com/analytics/answer/10917952?hl=en)
- [Google Campaign URL Builder](https://ga-dev-tools.google/campaign-url-builder/)
- [Google Analytics Help — Traffic-source dimension scopes and GCLID caution](https://support.google.com/analytics/answer/11080067?hl=en)

## รอบที่ 16 — CSV Cleaner และ Duplicate Finder

พัฒนาต่อเมื่อ 8 สิงหาคม 2026 จากผู้สมัครอันดับ 2 ของรอบที่ 15 โดยใช้หลักฐาน Google Autocomplete วันเดียวกัน: `csv cleaner` มีคำแนะนำ 8 รายการ เช่น online, tool, AI, Python, data cleaner และ duplicate cleaner ส่วน `csv duplicate remover` มี 7 รายการ ขณะที่ `remove duplicate rows online` มี 3 รายการ จึงรวม intent เหล่านี้เป็นหน้าเดียวแทนสร้างหน้าบางหลายหน้า

ขอบเขตถูกออกแบบให้ใช้ได้กับฝ่ายขาย การตลาด บัญชี ร้านค้า นักวิเคราะห์ และนักพัฒนา: รับ CSV/TSV/TXT หรือข้อความ, UTF-8/Windows-874, ตรวจตัวคั่นอัตโนมัติ, ตัดช่องว่างหัวท้าย, ลบแถวว่าง, เลือกหนึ่งหรือหลายคอลัมน์สำหรับตรวจซ้ำ, เทียบแบบแยกหรือไม่แยกตัวพิมพ์เล็ก-ใหญ่, ข้ามคีย์ว่าง, เลือกเก็บแถวแรกหรือแถวสุดท้าย และใช้โหมดค้นหาอย่างเดียวโดยไม่ลบได้ งาน parse/clean/serialize ทำใน Web Worker ภายใต้เพดานเดิม 10 MB, 50,000 แถว, 200 คอลัมน์ และ 500,000 เซลล์

ด้านความปลอดภัย OWASP ระบุว่า Spreadsheet อาจตีความเซลล์ที่ขึ้นต้นด้วย `=`, `+`, `-` หรือ `@` เป็นสูตร และไม่มีวิธี sanitize แบบเดียวที่ปลอดภัยกับทุกโปรแกรมและทุก downstream workflow เครื่องมือจึงเปิดการเติม Tab หน้าเซลล์เสี่ยงเป็นค่าเริ่มต้นสำหรับไฟล์ที่คนเปิดใน Spreadsheet แต่แสดงจำนวนเซลล์ที่เปลี่ยนและให้ปิดได้เมื่อระบบนำเข้าต้องรักษาข้อมูลเดิม ผู้ใช้ต้องยอมรับ trade-off อย่างชัดเจน ผลลัพธ์ quote ทุกเซลล์, escape quote ซ้อน, ใช้ CRLF และ UTF-8 BOM ตามโครงสร้าง CSV ที่สอดคล้องกับ RFC 4180

- [Google Autocomplete — csv cleaner](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=csv%20cleaner)
- [Google Autocomplete — csv duplicate remover](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=csv%20duplicate%20remover)
- [Google Autocomplete — remove duplicate rows online](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=remove%20duplicate%20rows%20online)
- [OWASP — CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)
- [OWASP WSTG — Testing for CSV Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/21-Testing_for_CSV_Injection)
- [RFC 4180 — Common Format and MIME Type for CSV](https://www.rfc-editor.org/info/rfc4180/)

## รอบที่ 17 — VAT Calculator Thailand และการจัดอันดับ Batch 27

สำรวจต่อเมื่อ 8 สิงหาคม 2569 โดยตรวจ Google Autocomplete ด้วย locale ไทยสำหรับคำตั้งต้นภาษาอังกฤษ 22 คำและภาษาไทย 20 คำ แล้วคัดแนวคิดที่ไม่ซ้ำ catalog มากเกินไป Google อธิบายว่า Autocomplete มาจากการค้นหาจริงและสะท้อนคำที่พบบ่อยหรือกำลังเป็นกระแสตามบริบท แต่ไม่ควรตีความจำนวนคำแนะนำเป็น search volume ส่วน Google Trends เป็นค่าความสนใจสัมพัทธ์และไม่ใช่ผลสำรวจ จึงใช้จำนวนคำแนะนำเพียงเป็นหลักฐานความกว้างของ long-tail intent ร่วมกับคุณค่าผู้ใช้ ความเสี่ยง ความสามารถทำฟรีใน Browser และโอกาสสร้างหน้าคุณภาพ

คะแนน 5 คือสูงที่สุด คอลัมน์ TH/EN คือจำนวนคำแนะนำสูงสุด 10 รายการจาก endpoint ที่ตรวจในรอบนี้ ไม่ใช่จำนวนค้นหารายเดือน:

| อันดับ | แนวคิด | TH/EN | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | VAT Calculator Thailand | 10/10 | 3 | 5 | 5 | 4 | 3 | ชนะ: intent ไทยชัดทั้ง VAT 7, ย้อนกลับ, Service Charge และ Excel; มีสูตรกับอัตราปัจจุบันจากกรมสรรพากร |
| 2 | Markdown Table Generator | 9/10 | 2 | 4 | 4 | 4 | 2 | demand กว้างและ client-only แต่กลุ่ม developer/content แคบกว่า VAT |
| 3 | Excel to CSV Converter | 10/10 | 3 | 5 | 4 | 5 | 2 | ใช้จริงสูง แต่ต่อจาก CSV สอง Batch จะทำ catalog กระจุกงานข้อมูล |
| 4 | HTML Table Generator | 8/10 | 3 | 4 | 4 | 4 | 3 | long-tail ไทยดีและต่อยอด Markdown ได้ แต่ควรออกแบบ accessibility/colspan ให้ครบ |
| 5 | Overtime Calculator Thailand | 10/10 | 4 | 5 | 5 | 4 | 3 | intent ไทยแข็งแรงมาก แต่ต้องแยกประเภทลูกจ้าง วันทำงาน วันหยุด และ version กฎหมายแรงงาน |
| 6 | Resume Builder | 10/10 | 5 | 5 | 5 | 5 | 4 | มูลค่าสูง แต่ต้องมี template, PDF, ATS semantics และความเป็นส่วนตัวก่อนเปิดตัว |
| 7 | Word Cloud Generator | 3/10 | 4 | 4 | 4 | 4 | 4 | เหมาะการศึกษา/คอนเทนต์ แต่ต้องตัดคำไทย ฟอนต์ และ export ภาพให้เชื่อถือได้ |
| 8 | Image Cropper | 1/10 | 3 | 5 | 5 | 5 | 2 | intent อังกฤษกว้าง มีงานวงกลม/พิกเซล/ขนาดจริง แต่สัญญาณคำไทยรอบนี้แคบ |
| 9 | Favicon / PWA Icon Generator | 2/10 | 3 | 4 | 4 | 4 | 3 | ทำฟรีได้และช่วย developer/ร้านค้า แต่ต้อง export หลายขนาดและ manifest อย่างถูกต้อง |
| 10 | Remove Image Metadata | 1/10 | 4 | 4 | 4 | 4 | 4 | privacy value สูง แต่ต้องพิสูจน์ชนิด metadata ที่ลบได้จริงในแต่ละ format |
| 11 | Password Strength Checker | 0/10 | 2 | 4 | 4 | 4 | 3 | อังกฤษกว้างแต่ไทยไม่แตกคำ; ต้องไม่ส่งรหัสผ่านและไม่อ้างเวลาถอดรหัสเกินหลักฐาน |
| 12 | Business Days Calculator | 4/10 | 3 | 4 | 4 | 4 | 3 | มี intent ออนไลน์/Excel แต่ต้องมีชุดวันหยุดไทย versioned และแยกวันหยุดองค์กร |
| 13 | JSON ↔ CSV Converter | 1/10 | 3 | 4 | 4 | 5 | 2 | intent อังกฤษ 10/10 ทั้งสองทิศทาง แต่ซ้ำกลุ่ม JSON/CSV เดิมและต้องเปิดเผยการ flatten nested data |
| 14 | Online Signature Maker | 2/10 | 3 | 4 | 4 | 4 | 3 | demand อังกฤษกว้าง แต่ทับกับ Sign PDF และต้องย้ำว่าไม่ใช่ digital certificate |
| 15 | Thai Number to Words | 4/1 | 2 | 4 | 3 | 4 | 3 | งานบัญชีใช้ง่าย แต่ intent ต่ำกว่ากลุ่มบนและมี logic บาทถ้วนอยู่ใน Quotation แล้ว |

VAT Calculator ถูกเลือกเพราะเพิ่มเครื่องมือสายธุรกิจ/บัญชีที่ใช้ได้กับร้านค้า ฟรีแลนซ์ พนักงานจัดซื้อ ฝ่ายขาย และผู้บริโภค โดยไม่ต้องเก็บข้อมูลหรือเรียก API ขอบเขตมีสองโหมด: บวก VAT จากราคาก่อนภาษี และถอด VAT จากราคารวมด้วยสูตร `ราคารวม × อัตรา / (100 + อัตรา)` รองรับ Service Charge ก่อน VAT และภาษีหัก ณ ที่จ่ายแบบปิดเป็นค่าเริ่มต้น อัตราทุกส่วนแก้ไขได้ ผลลัพธ์แสดงฐาน VAT ภาษี ยอดรวม ยอดหัก และยอดจ่ายสุทธิ พร้อมสูตรและนโยบายปัดแต่ละองค์ประกอบสองตำแหน่ง

กรมสรรพากรยืนยันเมื่อ 2 สิงหาคม 2569 ว่าการขายสินค้าและบริการทั่วไปยังใช้อัตรา VAT 7% และการขยายปัจจุบันถึง 30 กันยายน 2570 แต่มีสินค้า บริการ และกิจการที่ยกเว้น เครื่องมือจึงเก็บ preset พร้อมวันที่ตรวจสอบ/วันสิ้นสุดประกาศ ไม่อ้างว่า 7% ใช้กับทุกกรณี และไม่สร้างใบกำกับภาษี คู่มือกรมสรรพากรระบุสูตรภาษีขายเป็นมูลค่าสินค้าหรือบริการ × อัตราภาษี และกรณี VAT รวมอยู่ในราคายกตัวอย่างสูตร 7/107 ส่วนภาษีหัก ณ ที่จ่ายมีหลายอัตราตามประเภทเงินได้ ผู้จ่าย และผู้รับ จึงต้องแยกจาก VAT อย่างชัดเจนและให้ผู้ใช้เลือกเอง

- [Google Autocomplete — คำนวณ VAT](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%20vat)
- [Google Autocomplete — Markdown Table Generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=markdown%20table%20generator)
- [Google Autocomplete — แปลง Excel เป็น CSV](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20excel%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20csv)
- [Google Autocomplete — คำนวณโอที](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%82%E0%B8%AD%E0%B8%97%E0%B8%B5)
- [Google Trends Help — Trends และ Autocomplete ต้องตีความอย่างไร](https://support.google.com/trends/answer/4365533?hl=en)
- [กรมสรรพากร — ยืนยัน VAT 7% เมื่อ 2 สิงหาคม 2569](https://rd.go.th/fileadmin/user_upload/news/2569thai/news19_2569.pdf)
- [กรมสรรพากร — ขยาย VAT 7% ถึง 30 กันยายน 2570](https://rd.go.th/fileadmin/user_upload/news/2569thai/news18_2569.pdf)
- [กรมสรรพากร — คู่มือภาษีมูลค่าเพิ่มสำหรับ SMEs](https://www.rd.go.th/fileadmin/user_upload/SMEs/infographic/SME_lv3_1.pdf)
- [กรมสรรพากร — สูตร 7/107 เมื่อ VAT รวมในราคา](https://www.rd.go.th/fileadmin/user_upload/SMEs/infographic/info-e-business-63.pdf)
- [กรมสรรพากร — คู่มือภาษีหัก ณ ที่จ่ายและหลายอัตรา](https://interweb1.rd.go.th/publish/seminar/training/RD06.pdf)

## รอบที่ 18 — Markdown Table Generator และการจัดอันดับ Batch 28

สำรวจต่อเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย โดยเทียบคำตั้งต้นภาษาอังกฤษและภาษาไทยของผู้สมัครเดิมกับ long-tail เฉพาะงาน ตารางด้านล่างใช้จำนวนคำแนะนำสูงสุด 10 รายการเป็นสัญญาณความกว้างของ intent เท่านั้น ไม่ใช่ search volume รายเดือน การรับประกันอันดับหน้าแรกทำไม่ได้ จึงให้คะแนนร่วมกับประโยชน์จริง ความสามารถทำฟรีใน Browser, catalog overlap, ความเสี่ยง และคุณภาพหน้าที่ทำได้ครบ

คะแนน 5 คือสูงที่สุด คอลัมน์ TH/EN เป็นจำนวนคำแนะนำสูงสุดจาก endpoint ที่ตรวจในรอบนี้:

| อันดับ | แนวคิด | TH/EN | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | Markdown Table Generator | 9/10 | 2 | 4 | 4 | 4 | 3 | ชนะ: generator, formatter และ editor มี intent อังกฤษกว้าง; ทำ visual editor และ import Excel/CSV ได้โดยไม่ใช้ Server |
| 2 | Excel to CSV Converter | 10/10 | 3 | 5 | 4 | 5 | 2 | demand ไทยและอังกฤษแข็งแรง แต่จะเป็น Batch สาย CSV ลำดับที่สามติดกันหากเลือกทันที |
| 3 | HTML Table Generator | 8/10 | 3 | 4 | 4 | 4 | 3 | intent ดีและต่อยอดข้อมูลตารางได้ แต่ scope ที่ดีต้องรองรับ caption, scope, colspan/rowspan และ CSS accessibility |
| 4 | Resume Builder | 10/10 | 5 | 5 | 5 | 5 | 4 | มูลค่าสูง แต่ต้องมี ATS semantics, template, PDF, privacy และไม่ล็อก download หลัง login |
| 5 | Image Cropper | 1/10 | 3 | 5 | 5 | 5 | 3 | อังกฤษ 10/10 พร้อม circle, pixel, cm/mm และ quality; ไทยยังแคบ |
| 6 | Word Cloud Generator | 3/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10; ภาษาไทยต้องพิสูจน์ tokenization, ฟอนต์ และ export ภาพ |
| 7 | Favicon / PWA Icon Generator | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้องสร้าง ICO/PNG หลายขนาดและ manifest ที่ถูกต้อง |
| 8 | Business Days Calculator | 4/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ long-tail ผูกประเทศ; วันหยุดไทยและองค์กรต้อง version แยก |
| 9 | JSON to CSV Converter | 1/10 | 3 | 4 | 4 | 5 | 2 | อังกฤษ 10/10 แต่ทับ catalog JSON/CSV และต้องอธิบาย flatten nested object อย่างโปร่งใส |
| 10 | Remove Image Metadata | 1/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10 และมี privacy value; ต้องตรวจ metadata ทุก format หลัง re-encode จริง |
| 11 | Password Strength Checker | 0/10 | 2 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้อง client-only และไม่อ้างเวลาถอดรหัสจากสมมติฐานที่ตรวจไม่ได้ |
| 12 | Online Signature Maker | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ทับ Sign PDF และต้องแยกภาพลายเซ็นจาก digital certificate |
| 13 | Invoice Generator | 1/10 | 5 | 5 | 5 | 5 | 3 | อังกฤษ 10/10; เอกสารภาษีไทยและเลขที่เอกสารทำให้ scope เสี่ยงกว่า Quotation เดิม |
| 14 | Lorem Ipsum Generator | 1/10 | 2 | 3 | 3 | 3 | 2 | อังกฤษ 10/10แต่ utility value และ differentiation ต่ำกว่า visual table editor |
| 15 | Thai Number to Words | 4/1 | 2 | 4 | 3 | 4 | 3 | ใช้จริงในบัญชีแต่ intent ต่ำกว่า และ logic บาทถ้วนมีใน Quotation เดิมแล้ว |

Markdown Table Generator ถูกเลือกเพราะเพิ่มเครื่องมือสาย developer, documentation, data analyst และ content โดยไม่สร้าง Batch CSV ลำดับที่สามติดกัน ขอบเขตประกอบด้วย visual cell editor, เพิ่ม/ลบแถวและคอลัมน์, alignment รายคอลัมน์, import ข้อมูลจาก Excel/Google Sheets แบบ Tab และ CSV/Semicolon/Pipe ที่มี quote, Preview แบบ semantic table, คัดลอก และดาวน์โหลด `.md` ทุกอย่างทำใน Browser

ตาม GitHub Flavored Markdown ตารางต้องมี header row และ delimiter row, ใช้ Colon ที่ด้านซ้าย/ขวาของ Hyphen เพื่อกำหนด alignment และ Pipe ใน cell ต้อง escape ด้วย Backslash เครื่องมือจึงสร้างหัวว่างเป็น `คอลัมน์ N`, escape Backslash ก่อน Pipe, แปลง line break เป็น `<br>` และแจ้งว่า GFM ไม่รองรับ merged cells/colspan/rowspan รวมถึง renderer บางตัวอาจไม่รองรับ table extension หรือ raw HTML เหมือน GitHub จำกัด 100 แถว, 20 คอลัมน์, 1,000 ตัวอักษรต่อ cell และข้อความนำเข้า 100,000 ตัวอักษรเพื่อไม่ให้ editor input จำนวนมากทำให้ Browser ค้าง

- [Google Autocomplete — Markdown Table Generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=markdown%20table%20generator)
- [Google Autocomplete — Markdown Table Formatter](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=markdown%20table%20formatter)
- [Google Autocomplete — Markdown Table Editor](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=markdown%20table%20editor)
- [Google Autocomplete — สร้างตาราง Markdown](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%95%E0%B8%B2%E0%B8%A3%E0%B8%B2%E0%B8%87%20markdown)
- [Google Autocomplete — แปลง Excel เป็น CSV](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20excel%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20csv)
- [Google Autocomplete — HTML Table Generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=html%20table%20generator)
- [GitHub Docs — Organizing information with tables](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-tables)
- [GitHub Flavored Markdown Spec — Tables extension](https://github.github.com/gfm/#tables-extension-)

## รอบที่ 19 — Excel to CSV Converter และการจัดอันดับ Batch 29

สำรวจต่อเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทยและตรวจหน้าคู่แข่งที่ติดผลค้นหาสำหรับ intent การแปลงตาราง จำนวนคำแนะนำสูงสุด 10 รายการเป็นเพียงสัญญาณว่ามี long-tail intent ไม่ใช่ search volume และไม่สามารถรับประกันอันดับหน้าแรก Google ได้ การเลือกจึงรวมประโยชน์จริง ความครบของหน้าที่ทำได้ฟรีใน Browser, catalog overlap, ความเสี่ยง ความเป็นส่วนตัว และโอกาสสร้างเนื้อหาที่ตอบโจทย์กว่าหน้าแปลงไฟล์แบบบาง

คะแนน 5 คือสูงที่สุด คอลัมน์ TH/EN เป็นจำนวนคำแนะนำสูงสุดจาก endpoint ที่ตรวจในรอบนี้:

| อันดับ | แนวคิด | TH/EN | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | Excel to CSV Converter | 10/10 | 3 | 5 | 4 | 5 | 3 | ชนะ: intent ไทย/อังกฤษชัด ทำ multi-sheet, Preview, BOM และ privacy-first ได้จริงใน Browser |
| 2 | HTML Table Generator | 8/10 | 3 | 4 | 4 | 4 | 3 | demand ดี แต่ควรทำ semantics, caption, scope, responsive preview และ CSS export ให้ครบ |
| 3 | Resume Builder | 10/10 | 5 | 5 | 5 | 5 | 4 | มูลค่าสูง แต่ต้องพิสูจน์ ATS semantics, PDF ภาษาไทย, privacy และหลาย template |
| 4 | Image Cropper | 1/10 | 3 | 5 | 5 | 5 | 3 | อังกฤษ 10/10; ควรรองรับ pixel, ratio, circle, rotate และ quality โดยไม่เสีย metadata policy |
| 5 | Favicon / PWA Icon Generator | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้องสร้าง ICO/PNG/manifest หลายขนาดและตรวจไฟล์ผลจริง |
| 6 | Word Cloud Generator | 3/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10; ภาษาไทยต้องมี tokenization และฟอนต์ที่ export ได้ถูกต้อง |
| 7 | Remove Image Metadata | 1/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10 และมี privacy value แต่ต้องตรวจ EXIF/XMP/IPTC หลัง re-encode ทุก format |
| 8 | Business Days Calculator | 4/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; วันหยุดไทย/ประเทศ/องค์กรต้องเป็นชุดข้อมูล versioned |
| 9 | JSON to CSV Converter | 1/10 | 3 | 4 | 4 | 5 | 2 | อังกฤษ 10/10 แต่ทับกลุ่มเดิมและต้องให้ผู้ใช้ควบคุม flatten array/object |
| 10 | Password Strength Checker | 0/10 | 2 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้อง client-only และไม่อ้างเวลาถอดรหัสจากสมมติฐานลวง |
| 11 | Online Signature Maker | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ทับ Sign PDF และต้องสื่อว่าไม่ใช่ digital certificate |
| 12 | Invoice Generator | 1/10 | 5 | 5 | 5 | 5 | 3 | อังกฤษ 10/10; กฎเอกสารภาษีและเลขที่เอกสารทำให้ความเสี่ยงสูงกว่า Quotation เดิม |
| 13 | PDF Compressor | 6/10 | 5 | 5 | 5 | 5 | 4 | demand ดีแต่ชะลอ: การ rasterize ทั้งหน้าอาจทำลาย text/search/accessibility และไม่ได้เล็กลงเสมอ |
| 14 | Character Counter | 8/10 | 1 | 3 | 3 | 3 | 1 | ทำง่ายแต่ intent และฟังก์ชันทับ Word Counter ที่มีอยู่แล้ว |
| 15 | Thai Number to Words | 4/1 | 2 | 4 | 3 | 4 | 3 | ใช้จริงในบัญชี แต่ demand ต่ำกว่าและ logic บาทถ้วนมีใน Quotation แล้ว |

Excel to CSV ถูกเลือกเพราะเพิ่มเส้นทางกลับของ CSV to Excel และตอบคำค้น `excel to csv`, `xlsx to csv` และ `แปลง excel เป็น csv` โดยมีความต่างเชิงคุณภาพ: เลือก Worksheet, ส่งออกทุกชีตเป็น ZIP, เลือก comma/semicolon/tab/pipe, CRLF/LF, UTF-8 BOM, Quote ทุกเซลล์, Preview และป้องกัน Formula Injection เป็นค่าเริ่มต้น ไฟล์จำกัด 10 MB, 50 Worksheet, 50,000 แถวต่อชีต, 200 คอลัมน์ และ 500,000 เซลล์รวม งานอ่าน/แปลงอยู่ใน Web Worker และไม่มี API รับ Workbook

ขอบเขตตั้งใจรองรับเฉพาะ `.xlsx` ไม่อ้างรองรับ `.xls`, macro, สูตร,สี, ฟอนต์,รูปภาพ, Chart หรือ merged cell เพราะ CSV เก็บได้เฉพาะค่าตาราง Microsoft ระบุว่า Excel เปิด CSV UTF-8 ได้ตามปกติเมื่อมี BOM จึงเปิด BOM เป็นค่าเริ่มต้นสำหรับภาษาไทย ส่วน `read-excel-file` รองรับ File/Blob/ArrayBuffer และมี export สำหรับ Web Worker จึงเหมาะกับสถาปัตยกรรม client-only ของโครงการ

- [Google Autocomplete — Excel to CSV Converter](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=excel%20to%20csv%20converter)
- [Google Autocomplete — แปลง Excel เป็น CSV](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20excel%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20csv)
- [Google Autocomplete — XLSX to CSV](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=xlsx%20to%20csv)
- [Microsoft — Opening CSV UTF-8 files correctly in Excel](https://support.microsoft.com/en-US/Excel/opening-csv-utf-8-files-correctly-in-excel)
- [Microsoft — Import or export text and CSV files](https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files)
- [read-excel-file — Browser and Web Worker API](https://github.com/catamphetamine/read-excel-file)
- [Google Search Central — SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google Search Central — Title links](https://developers.google.com/search/docs/appearance/title-link)

## รอบที่ 20 — HTML Table Generator และการจัดอันดับ Batch 30

สำรวจต่อเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย โดยเทียบคำตั้งต้นภาษาไทยและอังกฤษ รวมทั้ง long-tail ของแต่ละงาน จำนวนคำแนะนำสูงสุด 10 รายการเป็นสัญญาณความกว้างของ intent เท่านั้น ไม่ใช่ search volume และไม่สามารถรับประกันอันดับหน้าแรก Google ได้ การจัดอันดับจึงรวมประโยชน์จริง ความครบที่ทำได้ฟรีใน Browser, ความเสี่ยง, catalog overlap และโอกาสสร้างเนื้อหาที่ช่วยผู้ใช้จริงโดยไม่ยัดคำค้น

คะแนน 5 คือสูงที่สุด คอลัมน์ TH/EN เป็นจำนวนคำแนะนำสูงสุดจาก endpoint ที่ตรวจในรอบนี้:

| อันดับ | แนวคิด | TH/EN | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | HTML Table Generator | 8/10 | 3 | 4 | 4 | 4 | 3 | ชนะ: long-tail ขอ colspan/rowspan, merge cells, CSS, inline CSS และ import จาก Excel ชัดเจน; ทำ semantic editor ที่แตกต่างได้จริง |
| 2 | Resume Builder | 8/10 | 5 | 5 | 5 | 5 | 4 | มูลค่าสูง แต่ต้องทำ ATS semantics, PDF ภาษาไทย, privacy, หลาย template และไม่ล็อก download หลัง login จึงไม่ควรปล่อยเวอร์ชันบาง |
| 3 | Image Cropper | 4/10 | 3 | 5 | 5 | 5 | 3 | อังกฤษกว้างถึง ratio, circle และ pixel; เหมาะ Batch ถัดไปหากทำ rotate, exact size และ export quality ให้ครบ |
| 4 | Favicon / PWA Icon Generator | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้องสร้าง ICO, PNG หลายขนาด, manifest และตรวจไฟล์ผลจริง |
| 5 | Word Cloud Generator | 3/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10; ไทยต้องพิสูจน์ tokenization, stop words, ฟอนต์ และ export PNG/SVG |
| 6 | Business Days Calculator | 4/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; วันหยุดไทย ประเทศ และองค์กรต้องใช้ชุดข้อมูล versioned แยกจากการนับเสาร์อาทิตย์ |
| 7 | JSON to CSV Converter | 1/10 | 3 | 4 | 4 | 5 | 2 | อังกฤษ 10/10 แต่ทับกลุ่มข้อมูลเดิม; ต้องให้ผู้ใช้ควบคุม flatten object/array อย่างโปร่งใส |
| 8 | Remove Image Metadata | 1/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10 และมี privacy value; ต้องตรวจ EXIF/XMP/IPTC หลัง re-encode ในแต่ละ format จริง |
| 9 | Password Strength Checker | 0/10 | 2 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้อง client-only ใช้คำแนะนำที่อธิบายได้ และไม่อ้างเวลา crack จากสมมติฐานลวง |
| 10 | PDF Compressor | 10/10 | 5 | 5 | 5 | 5 | 4 | demand สูงแต่ชะลอ: rasterize อาจทำลาย text/search/accessibility และไม่รับประกันว่าไฟล์เล็กลง |
| 11 | Color Palette Generator | 0/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ใกล้ Color Picker เดิม; ต้องมี contrast, lock color และ export tokens เพื่อแตกต่าง |
| 12 | Aspect Ratio Calculator | 1/10 | 2 | 4 | 3 | 4 | 2 | อังกฤษ 10/10 ทำฟรีง่าย แต่ intent ไทยและความต่างเชิงผลิตภัณฑ์ยังต่ำ |
| 13 | File Checksum Calculator | 0/10 | 2 | 4 | 3 | 4 | 3 | อังกฤษ 10/10 แต่ทับ Hash Generator เดิม ควรขยายหน้าปัจจุบันแทนสร้างหน้า keyword ซ้ำ |
| 14 | Online Signature Maker | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษกว้างแต่ทับ Sign PDF และต้องสื่อชัดว่าไฟล์ภาพลายเซ็นไม่ใช่ digital certificate |
| 15 | Character Counter | 8/10 | 1 | 3 | 3 | 3 | 1 | ไทยดีและทำง่าย แต่ฟังก์ชันทับ Word Counter เดิม จึงควรปรับหน้าเดิมแทนสร้าง thin page |

HTML Table Generator ถูกเลือกเพราะตอบ intent สาย developer, content, data และ CMS โดยไม่เพิ่ม dependency หรือส่งข้อมูลขึ้น Server ขอบเขตไม่ใช่เพียง textarea สร้างแท็ก แต่มี visual cell editor, import Excel/Google Sheets/CSV/TSV, เพิ่ม/ลบแถวและคอลัมน์, merge/unmerge ด้วย colspan/rowspan, caption, thead/tbody, scope=col/row/colgroup/rowgroup, CSS + class, inline CSS, semantic HTML, responsive wrapper, Preview, copy และดาวน์โหลดเอกสาร HTML5

การออกแบบยึด W3C Tables Tutorial: ใช้ `th` และ `scope` ระบุความสัมพันธ์, ใช้ `caption` บอกหัวข้อ, ไม่ใช้ table เพื่อจัด Layout และห่อด้วยกรอบเลื่อนแนวนอนเมื่อจอแคบ หัวตารางใน `thead` ไม่อนุญาต rowspan ข้ามเข้า `tbody` ข้อความในเซลล์และ caption ถูก escape ก่อน Preview/Export เพื่อไม่ execute HTML หรือ Script จำกัด 100 แถว, 20 คอลัมน์, 1,000 ตัวอักษรต่อเซลล์ และข้อความนำเข้า 100,000 ตัวอักษรเพื่อรักษาความลื่นของ Browser

แนวทาง SEO ใช้ชื่อหน้าที่กระชับและตรง intent, primary keyword ที่มองเห็นได้, FAQ ที่ตอบข้อจำกัดจริง และเนื้อหา people-first ตาม Google Search Central ไม่สร้างหน้าซ้ำบาง ๆ เพื่อจับคำอย่าง checksum หรือ character counter ที่เครื่องมือเดิมตอบได้อยู่แล้ว และไม่อ้างรับประกันอันดับหน้าแรก

- [Google Autocomplete — HTML Table Generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=html%20table%20generator)
- [Google Autocomplete — สร้างตาราง HTML](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%95%E0%B8%B2%E0%B8%A3%E0%B8%B2%E0%B8%87%20html)
- [W3C WAI — Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/)
- [W3C WAI — Tables with two headers](https://www.w3.org/WAI/tutorials/tables/two-headers/)
- [W3C WAI — Table Tips](https://www.w3.org/WAI/tutorials/tables/tips/)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central — Title links](https://developers.google.com/search/docs/appearance/title-link)
