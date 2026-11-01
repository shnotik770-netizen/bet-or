-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('KINDERGARTEN', 'TALMUD_TORAH', 'GIRLS_SCHOOL', 'CHABAD_HOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "BabyGender" AS ENUM ('BOY', 'GIRL', 'TWINS');

-- CreateTable
CREATE TABLE "institutions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InstitutionType" NOT NULL DEFAULT 'OTHER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "institutionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yoldot" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT,
    "houseNumber" TEXT,
    "apartment" TEXT,
    "city" TEXT DEFAULT 'עפולה',
    "addressNotes" TEXT,
    "reporterId" INTEGER,
    "birthDate" DATE,
    "babyGender" "BabyGender",
    "preferences" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yoldot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" SERIAL NOT NULL,
    "yoledetId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InstitutionToYoledet" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_InstitutionToYoledet_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_name_key" ON "institutions"("name");

-- CreateIndex
CREATE INDEX "reporters_institutionId_idx" ON "reporters"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "reporters_institutionId_name_key" ON "reporters"("institutionId", "name");

-- CreateIndex
CREATE INDEX "yoldot_reporterId_idx" ON "yoldot"("reporterId");

-- CreateIndex
CREATE INDEX "yoldot_createdAt_idx" ON "yoldot"("createdAt");

-- CreateIndex
CREATE INDEX "visits_date_idx" ON "visits"("date");

-- CreateIndex
CREATE UNIQUE INDEX "visits_yoledetId_date_key" ON "visits"("yoledetId", "date");

-- CreateIndex
CREATE INDEX "_InstitutionToYoledet_B_index" ON "_InstitutionToYoledet"("B");

-- AddForeignKey
ALTER TABLE "reporters" ADD CONSTRAINT "reporters_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yoldot" ADD CONSTRAINT "yoldot_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "reporters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_yoledetId_fkey" FOREIGN KEY ("yoledetId") REFERENCES "yoldot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstitutionToYoledet" ADD CONSTRAINT "_InstitutionToYoledet_A_fkey" FOREIGN KEY ("A") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstitutionToYoledet" ADD CONSTRAINT "_InstitutionToYoledet_B_fkey" FOREIGN KEY ("B") REFERENCES "yoldot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
