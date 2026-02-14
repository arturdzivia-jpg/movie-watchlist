-- AlterEnum (only if Rating type exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Rating') THEN
        -- Check if NOT_INTERESTED doesn't already exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'NOT_INTERESTED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Rating')) THEN
            ALTER TYPE "Rating" ADD VALUE 'NOT_INTERESTED' BEFORE 'DISLIKE';
        END IF;
    END IF;
END $$;
