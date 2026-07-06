/// <reference types="nativewind/types" />

declare module 'upng-js' {
    interface UPngImage {
        width: number;
        height: number;
        depth: number;
        ctype: number;
        frames: number;
        tabs: {
            PLTE?: number[];
            // other tab types as needed
        };
        data: Uint8Array;
    }

    interface UPngStatic {
        decode(buffer: ArrayBuffer): UPngImage;
        encode(imgs: ArrayBuffer[], w: number, h: number, cnum: number, dels?: number[]): ArrayBuffer;
        toRGBA8(out: UPngImage): Uint8Array[];
    }

    const UPNG: UPngStatic;
    export default UPNG;
}