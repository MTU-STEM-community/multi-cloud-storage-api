-- Add metadata fields to File table
ALTER TABLE "File" ADD COLUMN "description" TEXT;
ALTER TABLE "File" ADD COLUMN "tags" TEXT[];
ALTER TABLE "File" ADD COLUMN "metadata" JSONB DEFAULT '{}';
ALTER TABLE "File" ADD COLUMN "isPublic" BOOLEAN DEFAULT false;
ALTER TABLE "File" ADD COLUMN "downloadCount" INTEGER DEFAULT 0;
ALTER TABLE "File" ADD COLUMN "lastAccessedAt" TIMESTAMP(3);
ALTER TABLE "File" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Create index for better search performance
CREATE INDEX "File_tags_idx" ON "File" USING GIN ("tags");
CREATE INDEX "File_metadata_idx" ON "File" USING GIN ("metadata");
CREATE INDEX "File_name_idx" ON "File" ("name");
CREATE INDEX "File_type_idx" ON "File" ("type");
CREATE INDEX "File_createdAt_idx" ON "File" ("createdAt");

-- Create FileTag table for better tag management
CREATE TABLE "FileTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileTag_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on tag name
CREATE UNIQUE INDEX "FileTag_name_key" ON "FileTag"("name");

-- Create junction table for File-Tag many-to-many relationship
CREATE TABLE "_FileToFileTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FileToFileTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- Create indexes for junction table
CREATE INDEX "_FileToFileTag_B_index" ON "_FileToFileTag"("B");

-- Add foreign key constraints
ALTER TABLE "_FileToFileTag" ADD CONSTRAINT "_FileToFileTag_A_fkey" FOREIGN KEY ("A") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_FileToFileTag" ADD CONSTRAINT "_FileToFileTag_B_fkey" FOREIGN KEY ("B") REFERENCES "FileTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
