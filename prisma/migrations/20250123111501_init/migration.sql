-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "cloudLocations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloudStorage" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CloudStorage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CloudStorageToFile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CloudStorageToFile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CloudStorageToFile_B_index" ON "_CloudStorageToFile"("B");

-- AddForeignKey
ALTER TABLE "_CloudStorageToFile" ADD CONSTRAINT "_CloudStorageToFile_A_fkey" FOREIGN KEY ("A") REFERENCES "CloudStorage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CloudStorageToFile" ADD CONSTRAINT "_CloudStorageToFile_B_fkey" FOREIGN KEY ("B") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
