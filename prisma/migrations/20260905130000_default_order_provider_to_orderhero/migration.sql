-- New manual activations originate from OrderHero. Historical rows keep their
-- original provider so existing audit records remain accurate.
ALTER TABLE "Order" ALTER COLUMN "provider" SET DEFAULT 'orderhero';
