import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

Object.defineProperty(window.URL, "createObjectURL", {
  value: vi.fn(() => "blob:mock"),
  writable: true,
});

Object.defineProperty(window.URL, "revokeObjectURL", {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(HTMLAnchorElement.prototype, "click", {
  value: vi.fn(),
  writable: true,
});

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!("ResizeObserver" in window)) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(window, "ResizeObserver", {
    value: ResizeObserverMock,
  });
}
