CREATE DATABASE IF NOT EXISTS `beautify petals_db`;
USE `beautify petals_db`;

-- Task 1: Products table
CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10,2),
  image_url TEXT,
  rating DECIMAL(3,1),
  is_popular TINYINT DEFAULT 0
);

-- SEED DATA
INSERT INTO products (name, category, price, image_url, rating, is_popular) VALUES
('Velvet Matte Lipstick', 'Lipstick', 1200, 'https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg?auto=compress&cs=tinysrgb&w=300', 4.8, 1),
('Luminous Foundation', 'Foundation', 2500, 'https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg?auto=compress&cs=tinysrgb&w=300', 4.5, 0),
('Glow Moisturizer', 'Moisturizer', 1800, 'https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg?auto=compress&cs=tinysrgb&w=300', 4.9, 1),
('Rose Water Toner', 'Toner', 950, 'https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg?auto=compress&cs=tinysrgb&w=300', 4.7, 0);
