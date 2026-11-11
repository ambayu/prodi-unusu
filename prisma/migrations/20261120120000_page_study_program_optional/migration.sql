-- Halaman milik Portal Pusat (tanpa tenant).
--
-- Banner beranda portal pusat disimpan sebagai widget `hero_slider` pada satu
-- halaman sistem (`slug = '__portal_hero__'`). Halaman itu tidak dimiliki
-- program studi mana pun, sehingga `study_program_id` harus boleh NULL.
ALTER TABLE `pages` MODIFY `study_program_id` INTEGER NULL;
