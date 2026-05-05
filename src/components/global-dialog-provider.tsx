"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type GlobalDialogPayload = {
  /** 弹层内容 */
  content: ReactNode;
  /** 变更时强制重挂 content（例如重置表单） */
  contentKey?: React.Key;
  contentClassName?: string;
  showCloseButton?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  headerClassName?: string;
  /** 为 true 时不渲染 DialogHeader（适用于内容区自带标题） */
  hideHeader?: boolean;
};

type GlobalDialogContextValue = {
  open: (payload: GlobalDialogPayload) => void;
  close: () => void;
  isOpen: boolean;
};

const GlobalDialogContext = createContext<GlobalDialogContextValue | null>(null);

export function GlobalDialogProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<GlobalDialogPayload | null>(null);

  const open = useCallback((next: GlobalDialogPayload) => {
    setPayload(next);
  }, []);

  const close = useCallback(() => {
    setPayload(null);
  }, []);

  const value = useMemo(
    () => ({
      open,
      close,
      isOpen: payload != null,
    }),
    [open, close, payload],
  );

  const showHeader =
    !payload?.hideHeader && (payload?.title != null || payload?.description != null);

  return (
    <GlobalDialogContext.Provider value={value}>
      {children}
      <Dialog
        open={payload != null}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        {payload != null ? (
          <DialogContent
            showCloseButton={payload.showCloseButton !== false}
            className={cn(payload.contentClassName)}
          >
            {showHeader ? (
              <DialogHeader className={cn("text-left", payload.headerClassName)}>
                {payload.title != null ? <DialogTitle>{payload.title}</DialogTitle> : null}
                {payload.description != null ? (
                  <DialogDescription>{payload.description}</DialogDescription>
                ) : null}
              </DialogHeader>
            ) : null}
            <div key={payload.contentKey ?? "global-dialog-body"}>{payload.content}</div>
          </DialogContent>
        ) : null}
      </Dialog>
    </GlobalDialogContext.Provider>
  );
}

export function useGlobalDialog() {
  const ctx = useContext(GlobalDialogContext);
  if (!ctx) {
    throw new Error("useGlobalDialog must be used within GlobalDialogProvider");
  }
  return ctx;
}
