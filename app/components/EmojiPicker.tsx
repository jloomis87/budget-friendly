import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Box, TextField, Typography, Paper, Popover, Tooltip, InputAdornment, Divider, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

// Define emoji categories with their corresponding arrays
export const emojiCategories = [
  { 
    title: 'Finance & Money', 
    emojis: ['💰', '💵', '💸', '💳', '🏦', '💹', '📈', '📉', '💎', '👛', '💼', '🧾', '💲', '💱', '🪙',
      '📊', '🧮', '💴', '💶', '💷', '🏧', '💡', '📋', '📇', '📬', '📭', '📄', '✉️', '📨', '📩',
      '💌', '💻', '📱', '⌚', '🖥️', '📟', '📠', '🏷️', '🔖', '📑', '☑️', '✅', '✓', '⭐', '🌟']
  },
  { 
    title: 'Shopping & Retail', 
    emojis: ['🛒', '🛍️', '👕', '👗', '👟', '👠', '👜', '🧥', '🕶️', '👑', '💄', '⌚', '💍', '🎒',
      '👔', '👖', '🧣', '🧤', '👒', '🎩', '🧢', '👞', '🥾', '🥿', '👢', '👚', '👘', '👙', '👝',
      '🦺', '💼', '👓', '🥽', '🧦', '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🪀', '🎮', '🎲',
      '🎯', '🎺', '🎸', '🪕', '🎻', '🥁', '🎹', '🪗', '🎨', '📱', '🧸', '📻', '🔌', '🧴', '🧼']
  },
  { 
    title: 'Food & Dining', 
    emojis: ['🍕', '🍔', '🍟', '🌮', '🌯', '🥗', '🍣', '🍱', '🍜', '🍲', '🍛', '🍝', '🥪', '🥙', '🥩',
      '🍖', '🍗', '🥓', '🧀', '🥚', '🍞', '🥐', '🥨', '🥯', '🥞', '🧇', '🍳', '🥘', '🍿', '🧂',
      '☕', '🍵', '🧋', '🥤', '🧃', '🥛', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥡']
  },
  { 
    title: 'Home & Living', 
    emojis: ['🏠', '🏡', '🏘️', '🏢', '🏣', '🏤', '🏥', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', 
      '🏰', '🪑', '🛋️', '🛏️', '🚪', '🪟', '🪴', '🧹', '🧼', '🧺', '🛁', '🚿', '🪠', '🧯',
      '🪞', '🧸', '🔧', '🪛', '🪚', '🧰', '💡', '🔌', '🧲', '🧻', '🪥', '🧴']
  },
  { 
    title: 'Transportation', 
    emojis: ['🚗', '🚙', '🚕', '🛻', '🏎️', '🚌', '🚎', '🚓', '🚑', '🚒', '🚐', '🛺', '🚲', '🛵', '🏍️',
      '✈️', '🚁', '🚀', '🚂', '🚆', '🚇', '🚊', '🚉', '🚤', '⛴️', '🚢', '🚞', '🚋', '🚝', '🚈']
  },
  { 
    title: 'Entertainment & Leisure', 
    emojis: ['🎬', '🎮', '🎯', '🎲', '🎨', '🎭', '🎪', '🎟️', '🎫', '🎼', '🎵', '🎸', '🎹', '🎺', '🎻',
      '🎷', '🎧', '📺', '📷', '🎥', '🎁', '🎊', '🎉', '🏟️', '🏀', '⚽', '🏈', '⚾',
      '🎾', '🎱', '🏉', '🏐', '🏓', '🎣', '🎳', '🥌', '⛸️', '🛷', '🎿']
  },
  { 
    title: 'Health & Medical', 
    emojis: ['💊', '💉', '🩹', '🩺', '🔬', '🧪', '🦷', '🧠', '👓', '🧬', '🏥', '⚕️', '🩸', '🩻', '🫀']
  },
  { 
    title: 'Education', 
    emojis: ['📚', '📝', '📎', '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🖍️', '📏', '📐', '📓', '📔', '📒', '📕',
      '📗', '📘', '📙', '🎓', '📋', '📌', '📍', '🧮', '📆', '📅']
  },
  { 
    title: 'Technology', 
    emojis: ['💻', '⌨️', '🖥️', '🖱️', '💿', '💾', '📀', '🔋', '🔌', '📱', '📲', '☎️', '📞', '📟',
      '📠', '⏱️', '⏲️', '⏰', '🕰️', '📡', '🔦', '🪫', '💡', '🔍', '🔎']
  },
  { 
    title: 'Travel & Places', 
    emojis: ['🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🌅', '🌄', '🌠', '🏙️', '🌆', '🌇',
      '🌉', '🏘️', '🏰', '🏯', '🏛️', '⛪', '🕌', '🕍', '⛩️', '🕋', '🛕', '🏛️', '🛬', '🛫', '🚏']
  },
  { 
    title: 'Nature & Weather', 
    emojis: ['🌲', '🌳', '🌴', '🌵', '🌱', '🌿', '☘️', '🍀', '🍃', '🍂', '🌾', '🌷', '🌹', '🌺', '🌸',
      '🌼', '🌻', '🌞', '🌝', '🌚', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙', '🌛',
      '🌜', '⭐', '🌟', '💫', '✨', '☄️', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️']
  },
  { 
    title: 'People & Activities', 
    emojis: ['👪', '👶', '👧', '👦', '👩', '👨', '👩‍🍼', '👨‍🍼', '👩‍🎓', '👨‍🎓', '👩‍⚕️', '👨‍⚕️', '👩‍🔧', '👨‍🔧',
      '👩‍🚒', '👨‍🚒', '👩‍🏫', '👨‍🏫', '👩‍💻', '👨‍💻', '👩‍🚀', '👨‍🚀', '👩‍⚖️', '👨‍⚖️', '👰', '🤵',
      '🧑‍🤝‍🧑', '🧗', '🏊', '🚴', '🧘', '🏋️', '🏄', '🏌️', '🧖', '🤾']
  },
  { 
    title: 'Animals & Pets', 
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷', '🐸', '🐵',
      '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐟', '🐠']
  },
  { 
    title: 'Special Symbols', 
    emojis: ['❤️', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💌', '💯', '✅', '❎', '🏆', '🥇', '🥈',
      '🥉', '🧿', '🔮', '🧸', '🎵', '🎶', '🎺']
  }
];

// Get all emojis for search functionality
export const emojiOptions = emojiCategories.flatMap(category => category.emojis);

// Create a comprehensive keyword map for search functionality
const enhancedEmojiKeywords: Record<string, string> = {
  // Transportation - enhanced keywords for better search
  '🚗': 'Car auto automobile vehicle transportation drive driving sedan motor journey travel road trip',
  '🚙': 'SUV car automobile vehicle transportation drive driving jeep truck terrain 4x4 off-road',
  '🚕': 'Taxi cab car automobile vehicle transportation ride service driver passenger fare meter',
  '🛻': 'Pickup Truck car automobile vehicle transportation utility cargo haul trailer tow',
  '🏎️': 'Racing Car automobile vehicle transportation sports speed fast race formula nascar track',
  '🚌': 'Bus vehicle transportation public transit commute school passenger route stop travel',
  '🚎': 'Trolleybus vehicle transportation public transit rail electric cable tram streetcar',
  '🚓': 'Police Car automobile vehicle transportation emergency law enforcement cop patrol siren',
  '🚑': 'Ambulance car automobile vehicle transportation emergency medical paramedic hospital rescue',
  '🚒': 'Fire Truck engine automobile vehicle transportation emergency fire fighter hose ladder',
  '🚐': 'Minivan car automobile vehicle transportation van family carpool passenger seats',
  '🛺': 'Auto Rickshaw vehicle transportation taxi tuk-tuk three-wheeler cart carriage',
  '🚲': 'Bicycle bike vehicle transportation cycling pedal exercise ride wheel helmet',
  '🛵': 'Motor Scooter vehicle transportation motorcycle moped vespa commute fuel',
  '🏍️': 'Motorcycle bike vehicle transportation cycle motorbike chopper ride engine',
  '✈️': 'Airplane plane aircraft vehicle transportation aviation flying flight travel trip jet airport',
  '🚁': 'Helicopter aircraft vehicle transportation aviation flying flight propeller rotor hover',
  
  // Animals and Pets - enhanced keywords
  '🐶': 'Dog Face pet animal puppy canine friend pooch woof companion loyal bark',
  '🐱': 'Cat Face pet animal kitten feline meow domestic companion purr whiskers',
  '🐭': 'Mouse Face animal rodent pet small cute cheese squeaky',
  '🐹': 'Hamster Face animal rodent pet small cute cage wheel',
  '🐰': 'Rabbit Face animal bunny pet easter hare carrot hop fluffy',
  '🦊': 'Fox Face animal wildlife dog-like canine clever cunning brush tail',
  '🐻': 'Bear Face animal wildlife large mammals forest honey grizzly',
  '🐼': 'Panda Face animal wildlife bear conservation bamboo china',
  '🐨': 'Koala animal wildlife bear cute australia marsupial eucalyptus',
  '🦁': 'Lion Face animal feline wildlife big cat savanna king mane pride roar',
  '🐯': 'Tiger Face animal feline wildlife big cat stripes jungle predator',
  '🐮': 'Cow Face animal livestock farm dairy moo cattle beef milk',
  '🐷': 'Pig Face animal livestock farm pork oink snout bacon ham',
  '🐸': 'Frog Face animal amphibian wildlife water pond toad croak',
  '🐵': 'Monkey Face animal primate wildlife jungle chimp banana'
};

// Enhance the getEmojiDescription function to use a more comprehensive keyword dictionary
export const emojiKeywords: Record<string, string> = {
  // Finance and Money
  '💰': 'Money Bag cash currency finance dollar wealth budget salary payment',
  '💵': 'Dollar Bill cash money currency finance bill note payment',
  '💸': 'Money with Wings cash flying spending expense payment expense transfer',
  '💳': 'Credit Card payment transaction finance debit card banking purchase',
  '🏦': 'Bank finance money building savings account financial institution banking',
  '💹': 'Chart Increasing growth finance market stock profit trending up economics',
  '📈': 'Chart Increasing growth finance market stock upward trend analytics statistics',
  '📉': 'Chart Decreasing finance market stock downward decline loss statistics',
  '💎': 'Gem Stone diamond jewel valuable treasure luxury wealth precious',
  '👛': 'Purse money wallet small bag finance pouch handbag accessory',
  '💼': 'Briefcase business work professional office finance documents job career',
  '🧾': 'Receipt invoice bill payment transaction record purchase store expense',
  '💲': 'Dollar Sign money currency finance symbol cash payment',
  '💱': 'Currency Exchange money finance forex conversion exchange rate trading',
  '🪙': 'Coin money finance currency gold metal cash penny dime quarter change',
  '📊': 'Bar Chart graph statistics data analytics finance report metrics presentation',
  '🧮': 'Abacus calculator counting math finance budget accounting arithmetic',
  '💴': 'Yen Banknote money japan currency finance cash payment',
  '💶': 'Euro Banknote money europe currency finance cash payment',
  '💷': 'Pound Banknote money uk britain currency finance cash payment',
  '🏧': 'ATM Sign automatic teller machine bank cash withdrawal money finance',
  
  // Shopping and Retail
  '🛒': 'Shopping Cart retail store market buy purchase grocery checkout trolley',
  '🛍️': 'Shopping Bags retail purchase fashion gifts merchandise consumer shopping',
  '👕': 'T-Shirt clothes clothing fashion apparel garment shirt top',
  '👗': 'Dress clothes clothing fashion apparel woman garment attire formal',
  '👟': 'Running Shoe sneaker shoe footwear sports athletic training footwear',
  '👠': 'High-Heeled Shoe footwear fashion formal women shoes stiletto',
  '👜': 'Handbag purse bag fashion accessories women shopping style',
  '🧥': 'Coat clothes clothing fashion apparel jacket outerwear winter',
  '🕶️': 'Sunglasses accessory eyewear summer fashion cool style protection',
  '👑': 'Crown royal king queen monarchy royalty princess prince',
  '💄': 'Lipstick makeup cosmetics beauty accessory fashion style',
  '⌚': 'Watch time clock wristwatch accessory device technology',
  '💍': 'Ring jewelry accessory engagement wedding diamond marriage',
  '🎒': 'Backpack bag school student travel hiking rucksack pack',
  
  // Food and Dining
  '🍕': 'Pizza food meal italian cheese dinner lunch restaurant takeout slice',
  '🍔': 'Hamburger food burger fast food meal sandwich restaurant',
  '🍟': 'French Fries food potato fast food restaurant side dish snack',
  '🌮': 'Taco food mexican meal shell beef lettuce cheese',
  '🌯': 'Burrito food mexican meal wrap rice beans',
  '🥗': 'Green Salad food healthy vegetables vegetarian vegan diet',
  '🍣': 'Sushi food japanese raw fish rice seafood restaurant',
  '🍱': 'Bento Box food japanese meal lunch container compartment',
  '🍜': 'Steaming Bowl food noodles soup ramen asian hot meal',
  '🍲': 'Pot of Food stew soup cooking meal hot dinner homemade',
  '🍝': 'Spaghetti food pasta italian noodles meal dinner',
  '🥪': 'Sandwich food bread lunch snack meal quick bite',
  '☕': 'Hot Beverage coffee tea drink hot cup morning cafe',
  '🍷': 'Wine Glass drink alcohol beverage red wine white wine dinner',
  
  // Home and Living
  '🏠': 'House home building residence dwelling property real estate',
  '🏡': 'House with Garden home building residence property yard outdoor',
  '🏘️': 'Houses buildings neighborhood community residential homes',
  '🏢': 'Office Building work corporate company highrise business',
  '🪑': 'Chair furniture seat home office sitting desk',
  '🛋️': 'Couch and Lamp furniture living room home lounge sofa seating',
  '🛏️': 'Bed furniture bedroom sleep home rest mattress',
  '🚪': 'Door entrance exit home house building opening',
  '🪟': 'Window home house building light view glass opening',
  '🧹': 'Broom cleaning home sweep housework chore tidy mop',
  '🧼': 'Soap cleaning hygiene wash home bathroom sanitation hand',
  '🧺': 'Basket laundry home cleaning clothes container hamper',
  '🛁': 'Bathtub bath bathroom home cleaning hygiene shower relaxation',
  '🚿': 'Shower bathroom home cleaning hygiene water washing',
  
  // Transportation
  '🚗': 'Car auto automobile vehicle transportation drive driving sedan',
  '🚙': 'SUV car automobile vehicle transportation drive driving jeep truck',
  '🚕': 'Taxi cab car automobile vehicle transportation ride service',
  '🛻': 'Pickup Truck car automobile vehicle transportation utility cargo',
  '🏎️': 'Racing Car automobile vehicle transportation sports speed fast race',
  '🚌': 'Bus vehicle transportation public transit commute school',
  '🚎': 'Trolleybus vehicle transportation public transit rail electric',
  '🚓': 'Police Car automobile vehicle transportation emergency law enforcement',
  '🚑': 'Ambulance car automobile vehicle transportation emergency medical',
  '🚒': 'Fire Truck engine automobile vehicle transportation emergency fire',
  '🚐': 'Minivan car automobile vehicle transportation van',
  '🛺': 'Auto Rickshaw vehicle transportation taxi tuk-tuk three-wheeler',
  '🚲': 'Bicycle bike vehicle transportation cycling pedal exercise',
  '🛵': 'Motor Scooter vehicle transportation motorcycle moped vespa',
  '🏍️': 'Motorcycle bike vehicle transportation cycle motorbike',
  '✈️': 'Airplane plane aircraft vehicle transportation aviation flying flight travel',
  '🚁': 'Helicopter aircraft vehicle transportation aviation flying flight',

  // Entertainment and Leisure
  '🎬': 'Clapper Board movie film cinema directing entertainment',
  '🎮': 'Video Game controller gaming play entertainment console',
  '🎯': 'Direct Hit target goal aim bullseye achievement game',
  '🎲': 'Game Die dice board game gambling random chance',
  '🎨': 'Artist Palette art painting color creativity hobby',
  '🎭': 'Performing Arts theater drama comedy masks entertainment',
  '🎪': 'Circus Tent entertainment performance carnival show',
  '🎵': 'Musical Note music song sound audio rhythm melody',
  '🎸': 'Guitar music instrument band rock play string',
  '🎹': 'Piano music instrument keyboard play classical',
  '🎺': 'Trumpet music instrument jazz brass band orchestra',
  '🎻': 'Violin music instrument string orchestra classical',
  '🎧': 'Headphones music audio listen sound device',
  
  // Animals and Pets
  '🐶': 'Dog Face pet animal puppy canine friend pooch woof companion loyal',
  '🐱': 'Cat Face pet animal kitten feline meow domestic companion',
  '🐭': 'Mouse Face animal rodent pet small cute',
  '🐹': 'Hamster Face animal rodent pet small cute cage',
  '🐰': 'Rabbit Face animal bunny pet easter hare',
  '🦊': 'Fox Face animal wildlife dog-like canine clever',
  '🐻': 'Bear Face animal wildlife large mammals forest',
  '🐼': 'Panda Face animal wildlife bear conservation bamboo',
  '🐨': 'Koala animal wildlife bear cute australia marsupial',
  '🦁': 'Lion Face animal feline wildlife big cat savanna king',
  '🐯': 'Tiger Face animal feline wildlife big cat stripes',
  '🐮': 'Cow Face animal livestock farm dairy moo',
  '🐷': 'Pig Face animal livestock farm pork oink',
  '🐸': 'Frog Face animal amphibian wildlife water',
  '🐵': 'Monkey Face animal primate wildlife jungle'
};

// Add an enhanced search function before the component definition
export const getCategoryKeywords = () => {
  return {
    'finance': ['money', 'cash', 'bank', 'dollar', 'payment', 'credit', 'currency', 'finance', 'bill', 'coin', 'wallet', 'economic', 'financial', 'budget', 'salary', 'income'],
    'shopping': ['shop', 'store', 'buy', 'purchase', 'retail', 'cart', 'bag', 'clothes', 'fashion', 'dress', 'shirt', 'shoes', 'accessories', 'market', 'mall', 'consumer'],
    'food': ['food', 'eat', 'meal', 'restaurant', 'pizza', 'burger', 'drink', 'dinner', 'lunch', 'breakfast', 'snack', 'kitchen', 'cooking', 'recipe', 'dish', 'cuisine', 'coffee', 'tea', 'beer', 'wine'],
    'home': ['home', 'house', 'apartment', 'living', 'room', 'furniture', 'bedroom', 'bathroom', 'kitchen', 'cleaning', 'decor', 'property', 'real estate', 'chair', 'bed', 'couch', 'residence'],
    'transport': ['car', 'vehicle', 'drive', 'transport', 'bus', 'truck', 'motorcycle', 'bike', 'bicycle', 'train', 'plane', 'flight', 'travel', 'commute', 'road', 'traffic', 'journey', 'trip'],
    'entertainment': ['fun', 'game', 'play', 'music', 'movie', 'film', 'theater', 'sport', 'concert', 'festival', 'party', 'event', 'show', 'art', 'hobby', 'leisure', 'recreation'],
    'health': ['health', 'medical', 'doctor', 'hospital', 'medicine', 'fitness', 'exercise', 'diet', 'wellness', 'pharmacy', 'therapy', 'care', 'pill', 'treatment', 'clinic'],
    'education': ['school', 'study', 'learn', 'education', 'book', 'university', 'college', 'student', 'class', 'course', 'knowledge', 'teaching', 'academic', 'lesson', 'research'],
    'technology': ['tech', 'computer', 'digital', 'phone', 'device', 'mobile', 'app', 'software', 'hardware', 'internet', 'web', 'online', 'electronic', 'gadget', 'screen'],
    'animals': ['animal', 'dog', 'cat', 'pet', 'wildlife', 'bird', 'fish', 'horse', 'zoo', 'farm', 'wild', 'creature', 'mammal', 'reptile', 'nature']
  };
};

// Function to create search index - moved outside of hook
const createSearchIndex = (emojiKeywords: Record<string, string>, emojiCategories: any[]) => {
  const index: Record<string, string[]> = {};
  
  // Index emojis by keywords
  Object.entries(emojiKeywords).forEach(([emoji, keywords]) => {
    const terms = keywords.toLowerCase().split(' ');
    terms.forEach(term => {
      if (!index[term]) index[term] = [];
      if (!index[term].includes(emoji)) index[term].push(emoji);
    });
  });
  
  // Index by category keywords
  const categoryKeywords = getCategoryKeywords();
  Object.entries(categoryKeywords).forEach(([category, terms]) => {
    const categoryEmojis = emojiCategories.find(c => 
      c.title.toLowerCase().includes(category) || 
      category.includes(c.title.toLowerCase().replace('&', ''))
    )?.emojis || [];
    
    terms.forEach(term => {
      if (!index[term]) index[term] = [];
      categoryEmojis.forEach(emoji => {
        if (!index[term].includes(emoji)) index[term].push(emoji);
      });
    });
  });
  
  return index;
};

interface EmojiPickerProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  isDark?: boolean;
}

// Memoized emoji button to prevent unnecessary re-renders
const MemoizedEmojiButton = memo(({ 
  emoji, 
  description, 
  onSelect, 
  isDark 
}: { 
  emoji: string; 
  description: string; 
  onSelect: (emoji: string) => void;
  isDark: boolean;
}) => (
  <Tooltip key={emoji} title={description}>
    <Button
      onClick={() => onSelect(emoji)}
      sx={{
        minWidth: 'auto',
        fontSize: '1.2rem',
        p: 1,
        '&:hover': { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'action.hover' }
      }}
    >
      {emoji}
    </Button>
  </Tooltip>
));

// Memoized emoji category for better performance
const MemoizedEmojiCategory = memo(({ 
  title, 
  emojis, 
  onSelect, 
  getEmojiDescription,
  isDark
}: { 
  title: string; 
  emojis: string[]; 
  onSelect: (emoji: string) => void;
  getEmojiDescription: (emoji: string) => string;
  isDark: boolean;
}) => (
  <div key={title}>
    <Typography 
      variant="subtitle2" 
      sx={{ 
        mb: 1, 
        fontWeight: 'bold', 
        color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
      }}
    >
      {title}
    </Typography>
    <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 1 }}>
      {emojis.slice(0, 30).map(emoji => (
        <MemoizedEmojiButton 
          key={emoji} 
          emoji={emoji} 
          description={getEmojiDescription(emoji)}
          onSelect={onSelect}
          isDark={isDark}
        />
      ))}
      {emojis.length > 30 && (
        <Button
          size="small"
          sx={{ 
            fontSize: '0.75rem', 
            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
            '&:hover': { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'action.hover' } 
          }}
        >
          {emojis.length - 30} more...
        </Button>
      )}
    </div>
    <Divider sx={{ my: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : undefined }} />
  </div>
));

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  anchorEl,
  onClose,
  onSelect,
  isDark = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmojis, setFilteredEmojis] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Create search index with useMemo inside the component
  const searchIndex = useMemo(() => createSearchIndex(emojiKeywords, emojiCategories), []);

  // Update the getEmojiDescription to incorporate enhanced keywords - memoize for performance
  const getEmojiDescription = useCallback((emoji: string): string => {
    // Check for enhanced keywords first, then fall back to basic keywords
    if (enhancedEmojiKeywords[emoji]) {
      // Return just the first part (before the first space) to display in tooltips
      return enhancedEmojiKeywords[emoji].split(' ')[0];
    }
    
    // Return the description or the emoji itself if not found
    return emojiKeywords[emoji] || emoji;
  }, []);

  // Optimize the search function with debounce and memoization
  const debouncedSearch = useCallback((query: string) => {
    setIsLoading(true);
    
    // Use setTimeout to prevent UI freezing
    setTimeout(() => {
      if (!query.trim()) {
        setFilteredEmojis([]);
        setIsLoading(false);
        return;
      }
      
      const searchTerms = query.toLowerCase().split(' ');
      
      // Use the precomputed index for faster lookups
      const matchedEmojis: Record<string, number> = {};
      
      // Look up each search term in the index
      searchTerms.forEach(term => {
        // Find exact matches first
        const exactMatches = searchIndex[term] || [];
        exactMatches.forEach(emoji => {
          matchedEmojis[emoji] = (matchedEmojis[emoji] || 0) + 10; // Higher score for exact matches
        });
        
        // Then find partial matches
        Object.entries(searchIndex).forEach(([indexTerm, emojis]) => {
          if (indexTerm.includes(term)) {
            emojis.forEach(emoji => {
              matchedEmojis[emoji] = (matchedEmojis[emoji] || 0) + 5; // Lower score for partial matches
            });
          }
        });
      });
      
      // Convert to array and sort by score
      const results = Object.entries(matchedEmojis)
        .sort((a, b) => b[1] - a[1])
        .map(([emoji]) => emoji)
        .slice(0, 50); // Limit results for performance
      
      setFilteredEmojis(results);
      setIsLoading(false);
    }, 20); // Small delay to not block rendering
  }, [searchIndex]);

  // Use debounce for search to prevent too many updates
  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedSearch(searchQuery);
    }, 150); // Debounce delay
    
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  // Reset search when popover closes or opens
  useEffect(() => {
    if (!anchorEl) {
      setSearchQuery('');
      setFilteredEmojis([]);
      setIsLoading(false);
      setShowAllCategories(false);
    }
  }, [anchorEl]);

  // Add a utility function to find which category an emoji belongs to
  const getEmojiCategory = useCallback((emoji: string): string => {
    for (const category of emojiCategories) {
      if (category.emojis.includes(emoji)) {
        return category.title;
      }
    }
    return "Other";
  }, []);

  // Memoize the grouped results for better performance
  const groupedResults = useMemo(() => {
    if (filteredEmojis.length === 0) return {};
    
    const groups: Record<string, string[]> = {};
    
    filteredEmojis.forEach(emoji => {
      const category = getEmojiCategory(emoji);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(emoji);
    });
    
    return groups;
  }, [filteredEmojis, getEmojiCategory]);

  // Memoize visible categories to improve rendering performance
  const visibleCategories = useMemo(() => {
    if (searchQuery) return [];
    // Show all categories if showAllCategories is true, otherwise just show first 5
    return showAllCategories ? emojiCategories : emojiCategories.slice(0, 5);
  }, [searchQuery, showAllCategories]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle showing all categories
  const handleShowAllCategories = () => {
    setShowAllCategories(true);
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'center',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'center',
        horizontal: 'center',
      }}
    >
      <Box sx={{ 
        p: 2, 
        width: 380, 
        maxHeight: 450, 
        overflow: 'auto',
        bgcolor: isDark ? 'rgba(25, 25, 25, 0.95)' : 'white',
        color: isDark ? 'white' : 'inherit'
      }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
          Select an icon
        </Typography>
        
        <TextField
          placeholder="Search icons..."
          value={searchQuery}
          onChange={handleSearchChange}
          variant="outlined"
          size="small"
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            sx: {
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : undefined,
              color: isDark ? '#fff' : undefined,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
              },
            }
          }}
        />
        
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {isLoading ? (
            <Typography 
              variant="body2" 
              sx={{ 
                textAlign: 'center', 
                color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary', 
                py: 2 
              }}
            >
              Searching...
            </Typography>
          ) : searchQuery ? (
            <div>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  mb: 1, 
                  fontWeight: 'bold', 
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
                }}
              >
                Search Results
              </Typography>
              {filteredEmojis.length > 0 ? (
                <div>
                  {/* Group search results by category */}
                  {Object.entries(groupedResults).map(([category, emojis]) => (
                    <div key={category}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          ml: 1, 
                          color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'text.secondary'
                        }}
                      >
                        {category}
                      </Typography>
                      <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 1 }}>
                        {emojis.map(emoji => (
                          <MemoizedEmojiButton 
                            key={emoji} 
                            emoji={emoji} 
                            description={getEmojiDescription(emoji)}
                            onSelect={onSelect}
                            isDark={isDark}
                          />
                        ))}
                      </div>
                      <Divider sx={{ my: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : undefined }} />
                    </div>
                  ))}
                </div>
              ) : (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    textAlign: 'center', 
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary', 
                    py: 2 
                  }}
                >
                  No emojis found for "{searchQuery}"
                </Typography>
              )}
            </div>
          ) : (
            <div>
              {visibleCategories.map((category) => (
                <MemoizedEmojiCategory
                  key={category.title}
                  title={category.title}
                  emojis={category.emojis}
                  onSelect={onSelect}
                  getEmojiDescription={getEmojiDescription}
                  isDark={isDark}
                />
              ))}
              {!showAllCategories && emojiCategories.length > 5 && (
                <Button 
                  variant="text" 
                  fullWidth
                  onClick={handleShowAllCategories}
                  sx={{ 
                    mt: 1, 
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'primary.main'
                  }}
                >
                  Show More Categories...
                </Button>
              )}
            </div>
          )}
        </div>
      </Box>
    </Popover>
  );
}; 