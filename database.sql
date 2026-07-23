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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `episodes`
--

LOCK TABLES `episodes` WRITE;
/*!40000 ALTER TABLE `episodes` DISABLE KEYS */;
INSERT INTO `episodes` VALUES (7,4,1,'Episode 1','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784759757/movies/episodes/ukaohsfeih8fbkki4jgt.mp4','movies/episodes/ukaohsfeih8fbkki4jgt','1m','2026-07-22 22:36:03'),(8,4,2,'Episode 2','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784759761/movies/episodes/e7wbu9mmkpqhb5oaugtd.mp4','movies/episodes/e7wbu9mmkpqhb5oaugtd','1m','2026-07-22 22:36:03'),(9,5,1,'Episode 1','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784759766/movies/episodes/bhuuq3mxnli9jpporpwe.mp4','movies/episodes/bhuuq3mxnli9jpporpwe','1m','2026-07-22 22:36:03'),(10,6,1,'Episode 1','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784815197/movies/episodes/a40otd6ln3jswcw4fsh1.mp4','movies/episodes/a40otd6ln3jswcw4fsh1','1m','2026-07-23 14:00:02'),(11,6,2,'Episode 2','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784815197/movies/episodes/faqlys3dwpe8dre0pq81.mp4','movies/episodes/faqlys3dwpe8dre0pq81','2m','2026-07-23 14:00:02'),(12,7,1,'Episode 2','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784815201/movies/episodes/eqhm4y2xwm84geivxbon.mp4','movies/episodes/eqhm4y2xwm84geivxbon','1m','2026-07-23 14:00:02');
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
) ENGINE=InnoDB AUTO_INCREMENT=177 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_access_logs`
--

LOCK TABLES `movie_access_logs` WRITE;
/*!40000 ALTER TABLE `movie_access_logs` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_recommendations`
--

LOCK TABLES `movie_recommendations` WRITE;
/*!40000 ALTER TABLE `movie_recommendations` DISABLE KEYS */;
INSERT INTO `movie_recommendations` VALUES (10,8,8),(11,8,6);
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
  `country` enum('Movie ya Kiengereza','Bongo Movie','Movie ya Kiarabu','Movie ya Kifilipino','Movie ya Kihindi','Movie ya Kitaliano','Movie ya Kikorea') NOT NULL,
  `language` varchar(100) NOT NULL,
  `category` enum('Action','Love Story','Drama','Mix') NOT NULL,
  `is_translated` tinyint(1) NOT NULL DEFAULT 0,
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
  PRIMARY KEY (`id`),
  KEY `idx_is_translated` (`is_translated`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movies`
--

LOCK TABLES `movies` WRITE;
/*!40000 ALTER TABLE `movies` DISABLE KEYS */;
INSERT INTO `movies` VALUES (6,'Series ya Majaribio 1','series','Movie ya Kitaliano','Kiswahili','Love Story',0,2016,2000.00,'Series Kali Hii','https://res.cloudinary.com/dlokcqf1h/image/upload/v1784815258/movies/posters/hcywomgavn5x0xpc5fjc.png','movies/posters/hcywomgavn5x0xpc5fjc',NULL,NULL,NULL,'2026-07-22 22:36:03',0.00,0),(7,'Movie ya Tatu','single','Bongo Movie','Kiswahili','Action',0,2008,2000.00,'Natest','https://res.cloudinary.com/dlokcqf1h/image/upload/v1784815055/movies/posters/fc0w4xddealx9zf5a8zs.png','movies/posters/fc0w4xddealx9zf5a8zs','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784815059/movies/videos/vguecjqtckzcmhfdog5h.mp4','movies/videos/vguecjqtckzcmhfdog5h','1m','2026-07-23 13:57:40',9.99,1),(8,'Series ya Majaribio 02','series','Movie ya Kifilipino','Kifilipino','Drama',0,2021,2000.00,'Movie Nzuri Hii','https://res.cloudinary.com/dlokcqf1h/image/upload/v1784815191/movies/posters/hquj6slaqf71zmlyhzjt.png','movies/posters/hquj6slaqf71zmlyhzjt',NULL,NULL,NULL,'2026-07-23 14:00:02',8.00,1);
/*!40000 ALTER TABLE `movies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otp_requests`
--

DROP TABLE IF EXISTS `otp_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `type` enum('login','reset') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `status` enum('sent','verified','expired','failed') DEFAULT 'sent',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_type` (`user_id`,`type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_ip_address` (`ip_address`),
  CONSTRAINT `otp_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_requests`
--

LOCK TABLES `otp_requests` WRITE;
/*!40000 ALTER TABLE `otp_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `otp_requests` ENABLE KEYS */;
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
  `plan_id` int(11) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seasons`
--

LOCK TABLES `seasons` WRITE;
/*!40000 ALTER TABLE `seasons` DISABLE KEYS */;
INSERT INTO `seasons` VALUES (4,6,1,'Mwangaza','2026-07-22 22:36:03'),(5,6,2,'Giza','2026-07-22 22:36:03'),(6,8,1,'Mwangaza','2026-07-23 14:00:02'),(7,8,2,'Giza','2026-07-23 14:00:02');
/*!40000 ALTER TABLE `seasons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_cancellations`
--

DROP TABLE IF EXISTS `subscription_cancellations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_cancellations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subscription_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','processed','cancelled') DEFAULT 'pending',
  `requested_at` datetime NOT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_subscription_id` (`subscription_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_cancellations_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cancellations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_cancellations`
--

LOCK TABLES `subscription_cancellations` WRITE;
/*!40000 ALTER TABLE `subscription_cancellations` DISABLE KEYS */;
/*!40000 ALTER TABLE `subscription_cancellations` ENABLE KEYS */;
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
  `status` enum('active','expired','cancelled','trial','cancelling') DEFAULT 'active',
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
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrator','+255677532140','Tanzania','Zanzibar',NULL,'mosnake111@gmail.com','$2b$10$8fFd8Tv6nQFROPWCt5vPt.4AavVo4155kbwDfLcRXbk4rKnH1vOWi','admin','2026-07-18 18:14:30',NULL,NULL,NULL,NULL,NULL,NULL,0),(6,'Abdulmajid','+255774581923','Tanzania','Zanzibar',NULL,'abdulajmiiyypanass@gmail.com','$2b$10$bVrhZ1UrYpdBnobOM3UZdOYJdskVYF.DM8BsX7yoJNr4Sgvvtjt0W','admin','2026-07-22 17:17:37',NULL,NULL,NULL,NULL,NULL,NULL,0);
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
  `watched_duration` int(11) DEFAULT 0 COMMENT 'Seconds watched',
  `total_duration` int(11) DEFAULT NULL COMMENT 'Total duration in seconds',
  `percentage` decimal(5,2) DEFAULT NULL COMMENT 'Watch percentage',
  `completed` tinyint(1) DEFAULT 0 COMMENT 'Mark as completed (>=90%)',
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_watch_progress` (`user_id`,`movie_id`,`episode_id`),
  KEY `episode_id` (`episode_id`),
  KEY `idx_watch_progress_user` (`user_id`),
  KEY `idx_watch_progress_movie` (`movie_id`),
  KEY `idx_last_updated` (`last_updated`),
  KEY `idx_user_movie` (`user_id`,`movie_id`),
  KEY `idx_percentage` (`percentage`),
  CONSTRAINT `watch_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `watch_progress_ibfk_2` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `watch_progress_ibfk_3` FOREIGN KEY (`episode_id`) REFERENCES `episodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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

-- Dump completed on 2026-07-24  3:12:54
