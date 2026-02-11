import React, { useRef, useState } from 'react';
import { supabase } from '../supabase';

interface AttachmentUploaderProps {
    onUploadComplete: (data: {
        url: string;
        name: string;
        size: number;
        mimeType: string;
        type: 'image' | 'document';
    }) => void;
    onError: (message: string) => void;
    disabled?: boolean;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
    onUploadComplete,
    onError,
    disabled = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const getFileExtension = (filename: string): string => {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            onError('Arquivo muito grande. O tamanho máximo é 10MB.');
            return;
        }

        // Validate file type
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.type);

        if (!isImage && !isDocument) {
            onError('Tipo de arquivo não suportado. Use: JPG, PNG, WEBP, PDF, DOC, DOCX, XLS ou XLSX.');
            return;
        }

        setIsUploading(true);

        try {
            // Generate unique filename
            const timestamp = Date.now();
            const extension = getFileExtension(file.name);
            const uniqueFilename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
            const filePath = `chat-attachments/${uniqueFilename}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('chat-attachments')
                .upload(uniqueFilename, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Upload error:', error);
                onError('Erro ao enviar arquivo. Tente novamente.');
                return;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(uniqueFilename);

            onUploadComplete({
                url: urlData.publicUrl,
                name: file.name,
                size: file.size,
                mimeType: file.type,
                type: isImage ? 'image' : 'document'
            });
        } catch (err) {
            console.error('Upload exception:', err);
            onError('Erro inesperado ao enviar arquivo.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const formatAcceptTypes = () => {
        return [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES].join(',');
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept={formatAcceptTypes()}
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || isUploading}
            />
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled || isUploading}
                className={`size-12 flex items-center justify-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all ${isUploading
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:text-primary hover:border-primary/30 active:scale-90'
                    }`}
                title="Anexar arquivo"
            >
                {isUploading ? (
                    <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                    <span className="material-symbols-outlined text-2xl">attach_file</span>
                )}
            </button>
        </>
    );
};

export default AttachmentUploader;
