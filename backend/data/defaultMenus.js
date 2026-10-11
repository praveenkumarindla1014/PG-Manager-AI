// Default weekly menu used when the owner hasn't set a menu for a day.

export const WEEKLY_DEFAULT_MENUS = {
  monday: {
    dayOfWeek: 'monday',
    breakfast: { items: [{ name: 'Idli Sambar', isVeg: true, nutrition: { calories: 250, protein: 8, carbs: 45, fat: 5 } }, { name: 'Tea/Coffee', isVeg: true, nutrition: { calories: 50, protein: 1, carbs: 8, fat: 2 } }], timing: '7:30 AM - 9:30 AM' },
    lunch: { items: [{ name: 'Rice & Dal Tadka', isVeg: true, nutrition: { calories: 350, protein: 14, carbs: 65, fat: 5.5 } }, { name: 'Aloo Gobi', isVeg: true, nutrition: { calories: 120, protein: 3, carbs: 18, fat: 5 } }], timing: '12:30 PM - 2:30 PM' },
    snacks: { items: [{ name: 'Samosa & Chai', isVeg: true, nutrition: { calories: 300, protein: 5, carbs: 38, fat: 16 } }], timing: '4:30 PM - 5:30 PM' },
    dinner: { items: [{ name: 'Paneer Butter Masala', isVeg: true, nutrition: { calories: 300, protein: 15, carbs: 12, fat: 22 } }, { name: 'Roti (3)', isVeg: true, nutrition: { calories: 240, protein: 7.5, carbs: 45, fat: 4.5 } }], timing: '7:30 PM - 9:30 PM' },
    totalNutrition: { calories: 1610, protein: 53.5, carbs: 231, fat: 60 }
  },
  tuesday: {
    dayOfWeek: 'tuesday',
    breakfast: { items: [{ name: 'Puri Bhaji', isVeg: true, nutrition: { calories: 380, protein: 7, carbs: 55, fat: 14 } }, { name: 'Filter Coffee', isVeg: true, nutrition: { calories: 60, protein: 2, carbs: 9, fat: 2 } }], timing: '7:30 AM - 9:30 AM' },
    lunch: { items: [{ name: 'Curd Rice & Pickle', isVeg: true, nutrition: { calories: 280, protein: 8, carbs: 42, fat: 8 } }, { name: 'Rajma Chawal', isVeg: true, nutrition: { calories: 360, protein: 12, carbs: 60, fat: 6 } }], timing: '12:30 PM - 2:30 PM' },
    snacks: { items: [{ name: 'Pakora & Green Chutney', isVeg: true, nutrition: { calories: 240, protein: 4, carbs: 28, fat: 12 } }], timing: '4:30 PM - 5:30 PM' },
    dinner: { items: [{ name: 'Mix Veg Curry & Chapati', isVeg: true, nutrition: { calories: 320, protein: 9, carbs: 48, fat: 10 } }], timing: '7:30 PM - 9:30 PM' },
    totalNutrition: { calories: 1640, protein: 42, carbs: 242, fat: 52 }
  },
  wednesday: {
    dayOfWeek: 'wednesday',
    breakfast: { items: [{ name: 'Upma & Coconut Chutney', isVeg: true, nutrition: { calories: 220, protein: 5, carbs: 36, fat: 6 } }, { name: 'Tea', isVeg: true, nutrition: { calories: 45, protein: 1, carbs: 7, fat: 1.5 } }], timing: '7:30 AM - 9:30 AM' },
    lunch: { items: [{ name: 'Veg Biryani & Raita', isVeg: true, nutrition: { calories: 420, protein: 10, carbs: 68, fat: 12 } }, { name: 'Mirchi Ka Salan', isVeg: true, nutrition: { calories: 150, protein: 3, carbs: 12, fat: 10 } }], timing: '12:30 PM - 2:30 PM' },
    snacks: { items: [{ name: 'Vada Pav', isVeg: true, nutrition: { calories: 290, protein: 6, carbs: 40, fat: 12 } }], timing: '4:30 PM - 5:30 PM' },
    dinner: { items: [{ name: 'Egg Curry / Paneer Tikka', isVeg: false, nutrition: { calories: 340, protein: 18, carbs: 14, fat: 22 } }, { name: 'Jeera Rice', isVeg: true, nutrition: { calories: 220, protein: 4, carbs: 44, fat: 3 } }], timing: '7:30 PM - 9:30 PM' },
    totalNutrition: { calories: 1685, protein: 47, carbs: 221, fat: 66.5 }
  },
  thursday: {
    dayOfWeek: 'thursday',
    breakfast: { items: [{ name: 'Dosa & Tomato Chutney', isVeg: true, nutrition: { calories: 280, protein: 6, carbs: 48, fat: 7 } }, { name: 'Coffee', isVeg: true, nutrition: { calories: 50, protein: 1, carbs: 8, fat: 2 } }], timing: '7:30 AM - 9:30 AM' },
    lunch: { items: [{ name: 'South Indian Thali', isVeg: true, nutrition: { calories: 450, protein: 12, carbs: 75, fat: 10 } }, { name: 'Sambar & Rasam', isVeg: true, nutrition: { calories: 120, protein: 4, carbs: 20, fat: 2 } }], timing: '12:30 PM - 2:30 PM' },
    snacks: { items: [{ name: 'Bhel Puri', isVeg: true, nutrition: { calories: 180, protein: 4, carbs: 32, fat: 4 } }], timing: '4:30 PM - 5:30 PM' },
    dinner: { items: [{ name: 'Kadai Paneer & Phulka', isVeg: true, nutrition: { calories: 360, protein: 16, carbs: 42, fat: 14 } }], timing: '7:30 PM - 9:30 PM' },
    totalNutrition: { calories: 1440, protein: 43, carbs: 225, fat: 39 }
  },
  friday: {
    dayOfWeek: 'friday',
    breakfast: { items: [{ name: 'Aloo Paratha & Curd', isVeg: true, nutrition: { calories: 350, protein: 8, carbs: 50, fat: 12 } }, { name: 'Tea', isVeg: true, nutrition: { calories: 50, protein: 1, carbs: 8, fat: 2 } }], timing: '7:30 AM - 9:30 AM' },
    lunch: { items: [{ name: 'Chicken Curry / Shahi Paneer', isVeg: false, nutrition: { calories: 400, protein: 24, carbs: 12, fat: 26 } }, { name: 'Pulao', isVeg: true, nutrition: { calories: 250, protein: 5, carbs: 48, fat: 4 } }], timing: '12:30 PM - 2:30 PM' },
    snacks: { items: [{ name: 'Mirchi Bajji & Tea', isVeg: true, nutrition: { calories: 220, protein: 4, carbs: 26, fat: 10 } }], timing: '4:30 PM - 5:30 PM' },
    dinner: { items: [{ name: 'Dal Makhani & Naan', isVeg: true, nutrition: { calories: 380, protein: 12, carbs: 54, fat: 14 } }], timing: '7:30 PM - 9:30 PM' },
    totalNutrition: { calories: 1650, protein: 54, carbs: 198, fat: 68 }
  },
  saturday: {
    dayOfWeek: 'saturday',
    breakfast: { items: [{ name: 'Uttapam & Sambhar', isVeg: true, nutrition: { calories: 260, protein: 7, carbs: 46, fat: 5 } }, { name: 'Filter Coffee', isVeg: true, nutrition: { calories: 60, protein: 2, carbs: 9, fat: 2 } }], timing: '7:30 AM - 9:30 AM' },
    lunch: { items: [{ name: 'Chole Bhature', isVeg: true, nutrition: { calories: 480, protein: 12, carbs: 64, fat: 20 } }, { name: 'Sweet Lassi', isVeg: true, nutrition: { calories: 180, protein: 5, carbs: 26, fat: 6 } }], timing: '12:30 PM - 2:30 PM' },
    snacks: { items: [{ name: 'Pav Bhaji', isVeg: true, nutrition: { calories: 320, protein: 7, carbs: 48, fat: 12 } }], timing: '4:30 PM - 5:30 PM' },
    dinner: { items: [{ name: 'Veg Hakka Noodles & Manchurian', isVeg: true, nutrition: { calories: 410, protein: 9, carbs: 62, fat: 14 } }], timing: '7:30 PM - 9:30 PM' },
    totalNutrition: { calories: 1710, protein: 42, carbs: 255, fat: 59 }
  },
  sunday: {
    dayOfWeek: 'sunday',
    breakfast: { items: [{ name: 'Special Masala Dosa & Vadai', isVeg: true, nutrition: { calories: 360, protein: 9, carbs: 54, fat: 11 } }, { name: 'Tea/Coffee', isVeg: true, nutrition: { calories: 50, protein: 1, carbs: 8, fat: 2 } }], timing: '8:00 AM - 10:00 AM' },
    lunch: { items: [{ name: 'Special Chicken Biryani / Special Veg Thali', isVeg: false, nutrition: { calories: 520, protein: 28, carbs: 68, fat: 16 } }, { name: 'Gulab Jamun (2)', isVeg: true, nutrition: { calories: 220, protein: 3, carbs: 36, fat: 8 } }], timing: '12:30 PM - 3:00 PM' },
    snacks: { items: [{ name: 'Samosa Chat & Chai', isVeg: true, nutrition: { calories: 280, protein: 5, carbs: 36, fat: 12 } }], timing: '4:30 PM - 6:00 PM' },
    dinner: { items: [{ name: 'Butter Chicken / Paneer Korma', isVeg: false, nutrition: { calories: 390, protein: 22, carbs: 14, fat: 28 } }, { name: 'Garlic Naan (2)', isVeg: true, nutrition: { calories: 280, protein: 8, carbs: 46, fat: 6 } }], timing: '7:30 PM - 9:30 PM' },
    totalNutrition: { calories: 2100, protein: 76, carbs: 262, fat: 83 }
  }
};
