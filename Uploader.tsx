import React from 'react';
import { FileUploaderRegular } from "@uploadcare/react-uploader";
import "@uploadcare/react-uploader/core.css";

interface UploaderProps {
    onUploadSuccess?: (url: string) => void;
}

export default function Uploader({ onUploadSuccess }: UploaderProps) {
    const handleFileUploadSuccess = (fileInfo: any) => {
        if (onUploadSuccess && fileInfo.cdnUrl) {
            onUploadSuccess(fileInfo.cdnUrl);
        }
    };

    return (
        <div className="uc-light uc-purple">
            <FileUploaderRegular
                pubkey="402730eca012e7f7f816"
                classNameUploader="uc-light uc-purple"
                sourceList="local, camera, gdrive, facebook"
                userAgentIntegration="llm-nextjs"
                filesViewMode="grid"
                onFileUploadSuccess={handleFileUploadSuccess}
            />
        </div>
    );
}
