-- Bank dokumen prodi: membuat ulang tabel `documents` (tidak ada di database lokal).
CREATE TABLE IF NOT EXISTS `documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `study_program_id` INTEGER NOT NULL,
    `code` VARCHAR(50) NULL,
    `title` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `year` INTEGER NOT NULL DEFAULT 2026,
    `file_url` VARCHAR(500) NOT NULL,
    `file_size` INTEGER NULL,
    `mime_type` VARCHAR(120) NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT true,
    `download_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `documents_study_program_id_is_public_idx`(`study_program_id`, `is_public`),
    INDEX `documents_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `documents` ADD CONSTRAINT `documents_study_program_id_fkey` FOREIGN KEY (`study_program_id`) REFERENCES `study_programs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
