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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_recommendations`
--

LOCK TABLES `movie_recommendations` WRITE;
/*!40000 ALTER TABLE `movie_recommendations` DISABLE KEYS */;
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
  `movie_type` enum('Imetafsiriwa','Haijatafsiriwa') NOT NULL,
  `country` enum('Bongo Movie','Movie ya Kiarabu','Movie ya Kifilipino','Movie ya Kihindi','Movie ya Kitaliano','Movie ya Kikorea') NOT NULL,
  `language` varchar(100) NOT NULL,
  `category` enum('Action','Love Story','Drama','Mix') NOT NULL,
  `year` year(4) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `poster` varchar(255) DEFAULT NULL,
  `video` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `poster_public_id` varchar(255) DEFAULT NULL,
  `video_public_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movies`
--

LOCK TABLES `movies` WRITE;
/*!40000 ALTER TABLE `movies` DISABLE KEYS */;
INSERT INTO `movies` VALUES (2,'Avengers','Imetafsiriwa','Movie ya Kikorea','Kiswahili','Action',2010,10000.00,'Movie ya Majaribio','https://res.cloudinary.com/dlokcqf1h/image/upload/v1784403948/movies/posters/ajyw4zcoxobcnwqzvmqd.png','https://res.cloudinary.com/dlokcqf1h/video/upload/v1784403951/movies/videos/vejondyqksusu7k9scbu.mp4','2026-07-18 19:45:50','movies/posters/ajyw4zcoxobcnwqzvmqd','movies/videos/vejondyqksusu7k9scbu');
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
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,4,3,'TFX-1784552556298-202E2C',NULL,'mpesa','255712345678',NULL,15000.00,'TZS','pending',NULL,NULL,'2026-07-20 13:02:36','2026-07-20 13:02:36'),(2,4,1,'TFX-1784554773826-3966C6',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 13:39:33','2026-07-20 13:39:33'),(3,4,1,'TFX-1784554887782-B178DE',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 13:41:27','2026-07-20 13:41:27'),(4,4,1,'TFX-1784555336663-5AD93C',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 13:48:56','2026-07-20 13:48:56'),(5,4,1,'TFX-1784555485767-79FC42',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 13:51:25','2026-07-20 13:51:25'),(6,4,1,'TFX-1784555692314-A89B86',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 13:54:52','2026-07-20 13:54:52'),(7,4,1,'TFX-1784555754871-C976C8',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 13:55:54','2026-07-20 13:55:54'),(8,4,1,'TFX-1784556370059-17E747',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 14:06:10','2026-07-20 14:06:10'),(9,4,1,'TFX-1784556481717-694CA3',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 14:08:01','2026-07-20 14:08:01'),(10,4,1,'TFX-1784556659101-B0A3B4',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 14:10:59','2026-07-20 14:10:59'),(11,4,1,'TFX-1784556749210-D87C6D',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 14:12:29','2026-07-20 14:12:29'),(12,4,1,'TFX-1784557075835-43223C',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 14:17:55','2026-07-20 14:17:55'),(13,4,1,'TFX-1784557569218-632FE4',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 14:26:09','2026-07-20 14:26:09'),(14,4,1,'TFX-1784557709595-BE496D',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 14:28:29','2026-07-20 14:28:29'),(15,4,1,'TFX-1784558022045-4BD7C9',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 14:33:42','2026-07-20 14:33:42'),(16,4,1,'TFX-1784558166449-0652FF',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 14:36:06','2026-07-20 14:36:06'),(17,4,1,'TFX-1784559910691-E00C0B',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 15:05:10','2026-07-20 15:05:10'),(18,4,1,'TFX-1784560461309-5BB388',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 15:14:21','2026-07-20 15:14:21'),(19,4,1,'TFX-1784560781286-A57910',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 15:19:41','2026-07-20 15:19:41'),(20,4,1,'TFX-1784560889333-BCC0BA',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 15:21:29','2026-07-20 15:21:29'),(21,4,1,'TFX-1784563715862-0F0A98',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 16:08:35','2026-07-20 16:08:35'),(22,4,1,'TFX-1784563782789-45287B',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 16:09:42','2026-07-20 16:09:42'),(23,4,1,'TFX-1784563826397-A5DB06',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 16:10:26','2026-07-20 16:10:26'),(24,4,1,'TFX-1784563854320-A2DA5F',NULL,'mix_by_yas','255677532140',NULL,5000.00,'TZS','pending',NULL,NULL,'2026-07-20 16:10:54','2026-07-20 16:10:54');
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrator','+255677532140','Tanzania','Zanzibar',NULL,'mosnake111@gmail.com','$2b$10$8fFd8Tv6nQFROPWCt5vPt.4AavVo4155kbwDfLcRXbk4rKnH1vOWi','admin','2026-07-18 18:14:30',NULL,NULL,NULL,NULL,NULL),(4,'MO 11','0677532140','Kenya',NULL,'https://res.cloudinary.com/dlokcqf1h/image/upload/v1784405558/profiles/kfrcqtc8rilsrkiaumxd.png','molittle1011@gmail.com','$2b$10$ARmtTBWI1RdzD1/0wauZNuF0ZxlRlJEFaiskfZ0HwXzv978cU2MQa','user','2026-07-18 20:12:36','profiles/kfrcqtc8rilsrkiaumxd',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-21  2:41:10
