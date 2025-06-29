/*
  Warnings:

  - Made the column `metadata` on table `File` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isPublic` on table `File` required. This step will fail if there are existing NULL values in that column.
  - Made the column `downloadCount` on table `File` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "File_metadata_idx";

-- DropIndex
DROP INDEX "File_tags_idx";

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "metadata" SET NOT NULL,
ALTER COLUMN "isPublic" SET NOT NULL,
ALTER COLUMN "downloadCount" SET NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "File_tags_idx" ON "File"("tags");

-- CreateIndex
CREATE INDEX "File_metadata_idx" ON "File"("metadata");
