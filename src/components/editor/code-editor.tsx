"use client";

import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { sql, MySQL, PostgreSQL, SQLite, MSSQL } from "@codemirror/lang-sql";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { useTheme } from "next-themes";
import { useMemo, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Language = "text" | "json" | "sql" | "mysql" | "postgresql" | "sqlite" | "mssql" | "javascript";
const subscribeToHydration = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function CodeEditor({ value, onChange, language = "text", readOnly = false, label, minHeight = "18rem", className }: { value: string; onChange?: (value: string) => void; language?: Language; readOnly?: boolean; label: string; minHeight?: string; className?: string }) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);
  const extensions = useMemo(() => {
    const languageExtension = language === "json" ? json() : language === "javascript" ? javascript() : language === "mysql" ? sql({ dialect: MySQL }) : language === "postgresql" ? sql({ dialect: PostgreSQL }) : language === "sqlite" ? sql({ dialect: SQLite }) : language === "mssql" ? sql({ dialect: MSSQL }) : language === "sql" ? sql() : [];
    return [languageExtension, EditorView.lineWrapping].flat();
  }, [language]);
  return <div className={cn("code-editor overflow-hidden rounded-lg border bg-background", className)} style={{ minHeight }} role="group" aria-label={label} aria-busy={!mounted}>{mounted ? <CodeMirror value={value} onChange={onChange} extensions={extensions} editable={!readOnly} readOnly={readOnly} theme={resolvedTheme === "dark" ? "dark" : "light"} basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: !readOnly }} minHeight={minHeight} aria-label={`${label} editor`} /> : <div className="animate-pulse bg-muted/40" style={{ minHeight }} aria-label={`กำลังโหลด ${label}`} />}</div>;
}
