-- CreateTable
CREATE TABLE "User" (
    "name" TEXT NOT NULL,
    "money" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Counter" (
    "value" SERIAL NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("value")
);
