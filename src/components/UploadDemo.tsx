import { UploadDemoView } from "./uploadDemo/UploadDemoView";
import { useUploadDemoController } from "./uploadDemo/useUploadDemoController";

export const UploadDemo = () => {
  const viewProps = useUploadDemoController();
  return <UploadDemoView {...viewProps} />;
};
