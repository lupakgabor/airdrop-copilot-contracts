declare module 'chai' {
    global {
        export namespace Chai {
            interface Assertion {
                extraDays(expected: number): Promise<void>;
            }
        }
    }
}