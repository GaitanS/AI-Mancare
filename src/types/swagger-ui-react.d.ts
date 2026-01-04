declare module 'swagger-ui-react' {
    import * as React from 'react';

    export interface SwaggerUIProps {
        spec?: any;
        url?: string;
        layout?: string;
        docExpansion?: 'list' | 'full' | 'none';
        defaultModelExpandDepth?: number;
        defaultModelsExpandDepth?: number;
        presets?: any[];
        plugins?: any[];
        requestInterceptor?: (req: any) => any | Promise<any>;
        responseInterceptor?: (res: any) => any | Promise<any>;
        onComplete?: (system: any) => void;
        [key: string]: any;
    }

    const SwaggerUI: React.ComponentType<SwaggerUIProps>;
    export default SwaggerUI;
}
