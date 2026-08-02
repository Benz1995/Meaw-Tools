"use client";
export default function GlobalError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <html lang="th"><body><main style={{fontFamily:"sans-serif",padding:"3rem",textAlign:"center"}}><h1>เกิดข้อผิดพลาดที่ไม่คาดคิด</h1><p>โปรดลองโหลดเว็บไซต์ใหม่อีกครั้ง</p><button onClick={reset} style={{marginTop:"1rem",padding:"0.75rem 1rem"}}>ลองใหม่</button></main></body></html>}
