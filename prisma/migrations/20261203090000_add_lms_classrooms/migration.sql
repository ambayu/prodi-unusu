-- CreateTable
CREATE TABLE `lms_classrooms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `curriculum_item_id` INTEGER NOT NULL,
    `group` VARCHAR(30) NOT NULL DEFAULT 'Utama',
    `day` VARCHAR(20) NULL,
    `start_time` VARCHAR(5) NULL,
    `end_time` VARCHAR(5) NULL,
    `room` VARCHAR(100) NULL,
    `lecturer_nidn` VARCHAR(30) NULL,
    `lecturer_name` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lms_classrooms_curriculum_item_id_group_key`(`curriculum_item_id`, `group`),
    INDEX `lms_classrooms_lecturer_nidn_idx`(`lecturer_nidn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lms_classroom_students` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `classroom_id` INTEGER NOT NULL,
    `nim` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lms_classroom_students_classroom_id_nim_key`(`classroom_id`, `nim`),
    INDEX `lms_classroom_students_nim_idx`(`nim`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lms_classrooms` ADD CONSTRAINT `lms_classrooms_curriculum_item_id_fkey` FOREIGN KEY (`curriculum_item_id`) REFERENCES `curriculum_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lms_classroom_students` ADD CONSTRAINT `lms_classroom_students_classroom_id_fkey` FOREIGN KEY (`classroom_id`) REFERENCES `lms_classrooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;