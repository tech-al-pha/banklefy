import { useEffect, useRef } from "react";

const SCRIPT_SRC =
  "https://pl29484821.effectivecpmnetwork.com/dd8c7aaa1a3d6ad9a676dd8afeae6dca/invoke.js";
const CONTAINER_ID = "container-dd8c7aaa1a3d6ad9a676dd8afeae6dca";

export const AdsterraBanner = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountNode = mountRef.current;

    if (!mountNode) {
      return;
    }

    mountNode.innerHTML = "";

    const container = document.createElement("div");
    container.id = CONTAINER_ID;

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = SCRIPT_SRC;

    mountNode.append(container, script);

    return () => {
      script.remove();
      container.remove();
      mountNode.innerHTML = "";
    };
  }, []);

  return <div ref={mountRef} className="min-h-[90px] w-full overflow-hidden" />;
};
