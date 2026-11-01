-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('KINDERGARTEN', 'TALMUD_TORAH', 'GIRLS_SCHOOL', 'CHABAD_HOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "BabyGender" AS ENUM ('BOY', 'GIRL', 'TWINS');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateEnum
CREATE TYPE "HelpType" AS ENUM ('MEAL', 'HELP', 'BOTH');

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
    "street" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "apartment" TEXT,
    "city" TEXT NOT NULL DEFAULT 'עפולה',
    "addressNotes" TEXT,
    "institutionId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "birthDate" DATE NOT NULL,
    "babyGender" "BabyGender" NOT NULL,
    "notes" TEXT,
    "serviceStartDate" DATE NOT NULL,
    "serviceEndDate" DATE NOT NULL,
    "serviceDays" "Weekday"[],
    "helpType" "HelpType" NOT NULL DEFAULT 'MEAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yoldot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_name_key" ON "institutions"("name");

-- CreateIndex
CREATE INDEX "reporters_institutionId_idx" ON "reporters"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "reporters_institutionId_name_key" ON "reporters"("institutionId", "name");

-- CreateIndex
CREATE INDEX "yoldot_serviceStartDate_serviceEndDate_idx" ON "yoldot"("serviceStartDate", "serviceEndDate");

-- CreateIndex
CREATE INDEX "yoldot_institutionId_idx" ON "yoldot"("institutionId");

-- CreateIndex
CREATE INDEX "yoldot_reporterId_idx" ON "yoldot"("reporterId");

-- AddForeignKey
ALTER TABLE "reporters" ADD CONSTRAINT "reporters_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yoldot" ADD CONSTRAINT "yoldot_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yoldot" ADD CONSTRAINT "yoldot_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "reporters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
