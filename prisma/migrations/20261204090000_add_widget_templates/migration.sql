-- CreateTable
CREATE TABLE `widget_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `study_program_id` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` VARCHAR(400) NULL,
    `config_json` TEXT NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `widget_templates_study_program_id_is_active_idx`(`study_program_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `widget_templates` ADD CONSTRAINT `widget_templates_study_program_id_fkey` FOREIGN KEY (`study_program_id`) REFERENCES `study_programs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure master widget for Bank Widget exists
INSERT INTO `widgets` (`code`, `name`, `category`, `description`, `default_json`, `is_active`, `created_at`, `updated_at`)
VALUES (
    'custom_layout',
    'Bank Widget Kustom',
    'Supporting',
    'Widget susunan kolom buatan sendiri dari Bank Widget program studi.',
    '{"templateId":0,"templateName":""}',
    true,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `is_active` = true,
    `updated_at` = CURRENT_TIMESTAMP(3);
