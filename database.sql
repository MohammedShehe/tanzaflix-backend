-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: tanzaflix
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `episodes`
--

DROP TABLE IF EXISTS `episodes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `episodes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `season_id` int(11) NOT NULL,
  `episode_number` int(11) NOT NULL,
  `episode_title` varchar(255) DEFAULT NULL,
  `video_url` varchar(255) NOT NULL,
  `video_public_id` varchar(255) NOT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_episode` (`season_id`,`episode_number`),
  CONSTRAINT `episodes_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `episodes`
--

LOCK TABLES `episodes` WRITE;
/*!40000 ALTER TABLE `episodes` DISABLE KEYS */;
INSERT INTO `episodes` VALUES (1,1,1,'Pilot','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784591536/movies/episodes/o8ogu3rr2v0lsp5nocuv.mp4','movies/episodes/o8ogu3rr2v0lsp5nocuv','58m','2026-07-20 23:52:24'),(2,1,2,'Cat\'s in the Bag...','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784591540/movies/episodes/qgmggokxbmz8x0wjtvkb.mp4','movies/episodes/qgmggokxbmz8x0wjtvkb','48m','2026-07-20 23:52:24'),(3,1,3,'...And the Bag\'s in the River','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784591540/movies/episodes/minsdgc8agwk3wumjpkj.mp4','movies/episodes/minsdgc8agwk3wumjpkj','48m','2026-07-20 23:52:24'),(4,2,1,'Seven Thirty-Seven','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784591540/movies/episodes/jywxdpt6en72xhgwkfxf.mp4','movies/episodes/jywxdpt6en72xhgwkfxf','47m','2026-07-20 23:52:24'),(5,2,2,'Grilled','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784591544/movies/episodes/czafp1tz5vc3iuq94mwh.mp4','movies/episodes/czafp1tz5vc3iuq94mwh','48m','2026-07-20 23:52:24'),(6,2,3,'Bit by a Dead Bee','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784591544/movies/episodes/iff47to4oar5l9jcnyf4.mp4','movies/episodes/iff47to4oar5l9jcnyf4','47m','2026-07-20 23:52:24');
/*!40000 ALTER TABLE `episodes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movie_access`
--

DROP TABLE IF EXISTS `movie_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movie_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `movie_id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_access` (`user_id`,`movie_id`),
  KEY `movie_id` (`movie_id`),
  KEY `payment_id` (`payment_id`),
  CONSTRAINT `movie_access_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `movie_access_ibfk_2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`),
  CONSTRAINT `movie_access_ibfk_3` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_access`
--

LOCK TABLES `movie_access` WRITE;
/*!40000 ALTER TABLE `movie_access` DISABLE KEYS */;
/*!40000 ALTER TABLE `movie_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movie_access_logs`
--

DROP TABLE IF EXISTS `movie_access_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movie_access_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `movie_id` int(11) NOT NULL,
  `episode_id` int(11) DEFAULT NULL,
  `access_type` enum('free_trial','subscription','paid_single','denied') NOT NULL,
  `watched_duration` int(11) DEFAULT 0,
  `completed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_movie` (`user_id`,`movie_id`),
  KEY `idx_user_episode` (`user_id`,`episode_id`),
  KEY `fk_access_log_episode` (`episode_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_access_type` (`access_type`),
  KEY `idx_completed` (`completed`),
  KEY `idx_user_created` (`user_id`,`created_at`),
  KEY `idx_user_type_created` (`user_id`,`access_type`,`created_at`),
  KEY `idx_movie_created` (`movie_id`,`created_at`),
  CONSTRAINT `fk_access_log_episode` FOREIGN KEY (`episode_id`) REFERENCES `episodes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_access_log_movie` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_access_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_access_logs`
--

LOCK TABLES `movie_access_logs` WRITE;
/*!40000 ALTER TABLE `movie_access_logs` DISABLE KEYS */;
INSERT INTO `movie_access_logs` VALUES (1,4,2,NULL,'denied',0,0,'2026-07-20 23:54:53'),(2,4,2,NULL,'free_trial',0,0,'2026-07-21 00:02:55'),(3,4,2,NULL,'free_trial',0,0,'2026-07-21 00:02:55'),(4,4,2,NULL,'free_trial',0,0,'2026-07-22 00:59:28'),(5,4,2,NULL,'free_trial',0,0,'2026-07-22 00:59:28'),(6,4,2,NULL,'free_trial',0,0,'2026-07-22 01:02:04'),(7,4,2,NULL,'free_trial',0,0,'2026-07-22 01:02:04'),(8,4,1,NULL,'free_trial',0,0,'2026-07-22 01:02:15'),(9,4,1,NULL,'free_trial',0,0,'2026-07-22 01:02:15'),(10,5,2,NULL,'free_trial',0,0,'2026-07-22 01:16:42'),(11,5,2,NULL,'free_trial',0,0,'2026-07-22 01:16:42'),(12,5,2,NULL,'free_trial',0,0,'2026-07-22 01:22:15'),(13,5,2,NULL,'free_trial',0,0,'2026-07-22 01:22:15'),(14,4,2,NULL,'free_trial',0,0,'2026-07-22 02:20:19'),(15,4,2,NULL,'free_trial',0,0,'2026-07-22 02:20:19');
/*!40000 ALTER TABLE `movie_access_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movie_purchases`
--

DROP TABLE IF EXISTS `movie_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movie_purchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `movie_id` int(11) NOT NULL,
  `payment_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'TZS',
  `status` enum('pending','completed','expired') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_movie` (`user_id`,`movie_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_movie_id` (`movie_id`),
  KEY `fk_movie_purchase_payment` (`payment_id`),
  CONSTRAINT `fk_movie_purchase_movie` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_movie_purchase_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_movie_purchase_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_purchases`
--

LOCK TABLES `movie_purchases` WRITE;
/*!40000 ALTER TABLE `movie_purchases` DISABLE KEYS */;
/*!40000 ALTER TABLE `movie_purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movie_ratings`
--

DROP TABLE IF EXISTS `movie_ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movie_ratings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `movie_id` int(11) NOT NULL,
  `rating` decimal(3,1) NOT NULL CHECK (`rating` >= 0 and `rating` <= 10),
  `review_text` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_movie_rating` (`user_id`,`movie_id`),
  KEY `idx_movie_rating` (`movie_id`),
  KEY `idx_user_rating` (`user_id`),
  KEY `idx_rating_value` (`rating`),
  CONSTRAINT `movie_ratings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movie_ratings_ibfk_2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_ratings`
--

LOCK TABLES `movie_ratings` WRITE;
/*!40000 ALTER TABLE `movie_ratings` DISABLE KEYS */;
/*!40000 ALTER TABLE `movie_ratings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movie_recommendations`
--

DROP TABLE IF EXISTS `movie_recommendations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movie_recommendations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `movie_id` int(11) NOT NULL,
  `recommended_movie_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_movie_id` (`movie_id`),
  KEY `idx_recommended_movie_id` (`recommended_movie_id`),
  CONSTRAINT `movie_recommendations_ibfk_1` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movie_recommendations_ibfk_2` FOREIGN KEY (`recommended_movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_recommendations`
--

LOCK TABLES `movie_recommendations` WRITE;
/*!40000 ALTER TABLE `movie_recommendations` DISABLE KEYS */;
INSERT INTO `movie_recommendations` VALUES (1,1,1),(2,2,1);
/*!40000 ALTER TABLE `movie_recommendations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movies`
--

DROP TABLE IF EXISTS `movies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `movie_type` enum('single','series') NOT NULL DEFAULT 'single',
  `country` enum('Bongo Movie','Movie ya Kiarabu','Movie ya Kifilipino','Movie ya Kihindi','Movie ya Kitaliano','Movie ya Kikorea') NOT NULL,
  `language` varchar(100) NOT NULL,
  `category` enum('Action','Love Story','Drama','Mix') NOT NULL,
  `year` year(4) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `poster` varchar(255) DEFAULT NULL,
  `poster_public_id` varchar(255) DEFAULT NULL,
  `video` varchar(255) DEFAULT NULL,
  `video_public_id` varchar(255) DEFAULT NULL,
  `movie_time` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `avg_rating` decimal(3,2) DEFAULT 0.00,
  `total_ratings` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movies`
--

LOCK TABLES `movies` WRITE;
/*!40000 ALTER TABLE `movies` DISABLE KEYS */;
INSERT INTO `movies` VALUES (1,'Movie La Kutisha','series','Bongo Movie','Kiswahili','Action',2026,2000.00,'Hii ni movie ya majaribio','https://res.cloudinary.com/dlokcqf1h/image/upload/v1784591533/movies/posters/xezrpgbehpovjxh0f19m.jpg','movies/posters/xezrpgbehpovjxh0f19m',NULL,NULL,NULL,'2026-07-20 23:52:24',0.00,0),(2,'MO is Calling','single','Movie ya Kikorea','English','Drama',2008,2000.00,'Hii ni movie ya majaribio','https://res.cloudinary.com/dlokcqf1h/image/upload/v1784591636/movies/posters/apiizgn43fef9rzga1f9.jpg','movies/posters/apiizgn43fef9rzga1f9','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784591641/movies/videos/axuibtq2igw2i0uvf5so.mp4','movies/videos/axuibtq2igw2i0uvf5so','2h 32m','2026-07-20 23:54:02',0.00,0);
/*!40000 ALTER TABLE `movies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_logs`
--

DROP TABLE IF EXISTS `payment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `payment_id` int(11) DEFAULT NULL,
  `event_name` varchar(100) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `payment_id` (`payment_id`),
  CONSTRAINT `payment_logs_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_logs`
--

LOCK TABLES `payment_logs` WRITE;
/*!40000 ALTER TABLE `payment_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `payment_reference` varchar(100) NOT NULL,
  `gateway_transaction_id` varchar(100) DEFAULT NULL,
  `payment_method` enum('mix_by_yas','mpesa','airtel_money','bank_card') NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `account_name` varchar(150) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'TZS',
  `status` enum('pending','processing','paid','failed','cancelled','expired') DEFAULT 'pending',
  `gateway_response` text DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_reference` (`payment_reference`),
  KEY `plan_id` (`plan_id`),
  KEY `idx_payment_reference` (`payment_reference`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status` (`status`),
  KEY `idx_paid_at` (`paid_at`),
  KEY `idx_status_paid` (`status`,`paid_at`),
  KEY `idx_user_paid` (`user_id`,`status`,`paid_at`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,4,3,'TFX-1784680862720-76EFDB',NULL,'','0677532140',NULL,15000.00,'TZS','pending',NULL,NULL,'2026-07-22 00:41:02','2026-07-22 00:41:02'),(2,4,3,'TFX-1784681137034-5E8B79',NULL,'','0677532140',NULL,15000.00,'TZS','pending',NULL,NULL,'2026-07-22 00:45:37','2026-07-22 00:45:37'),(3,4,3,'TFX-1784681477324-BD30A8',NULL,'','0000000000',NULL,15000.00,'TZS','pending',NULL,NULL,'2026-07-22 00:51:17','2026-07-22 00:51:17'),(4,4,3,'TFX-1784681650577-366364',NULL,'','0000000000',NULL,15000.00,'TZS','pending',NULL,NULL,'2026-07-22 00:54:10','2026-07-22 00:54:10');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'TZS',
  `duration_days` int(11) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (1,'Daily',5000.00,'TZS',1,'Unlimited access for 1 day','active','2026-07-20 12:48:14','2026-07-20 12:48:14'),(2,'Weekly',8000.00,'TZS',7,'Unlimited access for 7 days','active','2026-07-20 12:48:14','2026-07-20 12:48:14'),(3,'Monthly',15000.00,'TZS',30,'Unlimited access for 30 days','active','2026-07-20 12:48:14','2026-07-20 12:48:14'),(4,'Yearly',80000.00,'TZS',365,'Unlimited access for 365 days','active','2026-07-20 12:48:14','2026-07-20 12:48:14');
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seasons`
--

DROP TABLE IF EXISTS `seasons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seasons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `movie_id` int(11) NOT NULL,
  `season_number` int(11) NOT NULL,
  `season_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_season` (`movie_id`,`season_number`),
  CONSTRAINT `seasons_ibfk_1` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seasons`
--

LOCK TABLES `seasons` WRITE;
/*!40000 ALTER TABLE `seasons` DISABLE KEYS */;
INSERT INTO `seasons` VALUES (1,1,1,'Season 1 - The Beginning','2026-07-20 23:52:24'),(2,1,2,'Season 2 - The Rise','2026-07-20 23:52:24');
/*!40000 ALTER TABLE `seasons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `status` enum('active','expired','cancelled','trial') DEFAULT 'active',
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_user_expires` (`user_id`,`status`,`expires_at`),
  KEY `idx_expires_status` (`expires_at`,`status`),
  CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `country` enum('Tanzania','Kenya','Uganda','Nchi nyengine') DEFAULT 'Tanzania',
  `region` enum('Bara','Zanzibar') DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `profile_public_id` varchar(255) DEFAULT NULL,
  `login_otp` varchar(6) DEFAULT NULL,
  `login_otp_expiry` datetime DEFAULT NULL,
  `reset_otp` varchar(6) DEFAULT NULL,
  `reset_otp_expiry` datetime DEFAULT NULL,
  `first_watch_at` timestamp NULL DEFAULT NULL,
  `has_watched_before` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_role_created` (`role`,`created_at`),
  KEY `idx_has_watched` (`has_watched_before`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrator','+255677532140','Tanzania','Zanzibar',NULL,'mosnake111@gmail.com','$2b$10$8fFd8Tv6nQFROPWCt5vPt.4AavVo4155kbwDfLcRXbk4rKnH1vOWi','admin','2026-07-18 18:14:30',NULL,NULL,NULL,NULL,NULL,NULL,0),(4,'MO 11','0677532140','Kenya',NULL,'https://res.cloudinary.com/dlokcqf1h/image/upload/v1784405558/profiles/kfrcqtc8rilsrkiaumxd.png','molittle1011@gmail.com','$2b$10$ARmtTBWI1RdzD1/0wauZNuF0ZxlRlJEFaiskfZ0HwXzv978cU2MQa','user','2026-07-18 20:12:36','profiles/kfrcqtc8rilsrkiaumxd',NULL,NULL,NULL,NULL,NULL,0),(5,'Mohammed Aminu Shehe','0677532140','Tanzania','Zanzibar','https://res.cloudinary.com/dlokcqf1h/image/upload/v1784682704/profiles/lgdpoe1ao9nl5uuij2o5.png','fourbrothers10112627@gmail.com','$2b$10$3v7bc5Xz/T9nvvxT3f32mez3Qrxk4Sy97NHeTX0KLvOldm4lRht7K','user','2026-07-22 01:11:42','profiles/lgdpoe1ao9nl5uuij2o5',NULL,NULL,'969355','2026-07-22 07:47:43',NULL,0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `watch_progress`
--

DROP TABLE IF EXISTS `watch_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `watch_progress` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `movie_id` int(11) NOT NULL,
  `episode_id` int(11) DEFAULT NULL,
  `watched_duration` int(11) DEFAULT 0,
  `total_duration` int(11) DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_watch_progress` (`user_id`,`movie_id`,`episode_id`),
  KEY `episode_id` (`episode_id`),
  KEY `idx_watch_progress_user` (`user_id`),
  KEY `idx_watch_progress_movie` (`movie_id`),
  KEY `idx_last_updated` (`last_updated`),
  KEY `idx_user_movie` (`user_id`,`movie_id`),
  CONSTRAINT `watch_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `watch_progress_ibfk_2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `watch_progress_ibfk_3` FOREIGN KEY (`episode_id`) REFERENCES `episodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `watch_progress`
--

LOCK TABLES `watch_progress` WRITE;
/*!40000 ALTER TABLE `watch_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `watch_progress` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-22  8:15:43
