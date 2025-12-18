import React, { useEffect, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/router';
import { LoadingState } from '@/components/LoadingState';
import { UserRole } from '@/utils/types';

function GroupManagement() {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { hasRole, isLoading, currentUser } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        if (!currentUser || !hasRole(UserRole.ADMIN)) {
            router.push('/');
            return;
        }

        const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
        if (!iframeDoc) return;

        iframeDoc.open();
        iframeDoc.write("<html><head></head><body></body></html>");
        iframeDoc.close();

        const link = iframeDoc.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
        iframeDoc.head.appendChild(link);

        const script = iframeDoc.createElement("script");
        script.src = 'https://ameyachatbotsettingsconfig.s3.us-east-1.amazonaws.com/group_management/group_management.js';

        script.onload = () => {
            // @ts-expect-error - The script adds GroupManagement to the window object
            if (iframeRef.current?.contentWindow?.GroupManagement) {
                // @ts-expect-error - GroupManagement is added to window by external script
                iframeRef.current.contentWindow.GroupManagement();
            }
        };

        script.onerror = () => {
            alert("Failed to load GroupManagement, please try again");
        };

        iframeDoc.head.appendChild(script);
    }, [isLoading, currentUser, hasRole, router]);

    if (isLoading) {
        return <LoadingState message="Checking permissions..." />;
    }

    if (!currentUser || !hasRole(UserRole.ADMIN)) {
        return null; // Will redirect in useEffect
    }

    return (
        <div style={{ height: '100vh', width: '100%' }}>
            <iframe
                ref={iframeRef}
                title="Ameya Extraction"
                style={{ width: "100%", height: "100vh", border: "none" }}
            />
        </div>
    );
}

export default GroupManagement;
