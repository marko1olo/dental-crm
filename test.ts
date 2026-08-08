class RealDate extends Date {}; class FixedDate extends RealDate { constructor(...args: unknown[]) { if (args.length === 0) super(1000); else super(...(args as [string | number | Date])); } }
