
export type QuoteCategory = 'stoicism' | 'motivation' | 'mindfulness' | 'creativity' | 'business' | 'discipline' | 'wisdom' | 'leadership';

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: QuoteCategory;
}

const quotes: Quote[] = [
  // Stoicism (10)
  { id: 's1', text: "Мы страдаем чаще в воображении, чем в действительности.", author: "Сенека", category: "stoicism" },
  { id: 's2', text: "Счастье вашей жизни зависит от качества ваших мыслей.", author: "Марк Аврелий", category: "stoicism" },
  { id: 's3', text: "То, что стоит на пути, становится путем.", author: "Марк Аврелий", category: "stoicism" },
  { id: 's4', text: "Человека возмущают не сами вещи, а то, как он их воспринимает.", author: "Эпиктет", category: "stoicism" },
  { id: 's5', text: "Начни жить сейчас, и считай каждый день отдельной жизнью.", author: "Сенека", category: "stoicism" },
  { id: 's6', text: "Лучшая месть — не быть похожим на своего врага.", author: "Марк Аврелий", category: "stoicism" },
  { id: 's7', text: "Нет ветра, который был бы попутным кораблю, не знающему, куда он плывет.", author: "Сенека", category: "stoicism" },
  { id: 's8', text: "Власть над собой — самая высшая власть.", author: "Сенека", category: "stoicism" },
  { id: 's9', text: "Пока мы откладываем жизнь, она проходит.", author: "Сенека", category: "stoicism" },
  { id: 's10', text: "Смерть улыбается всем нам, все, что мы можем сделать, это улыбнуться в ответ.", author: "Марк Аврелий", category: "stoicism" },

  // Motivation & Discipline (10)
  { id: 'm1', text: "Начинай оттуда, где ты есть. Используй то, что у тебя есть. Делай то, что можешь.", author: "Артур Эш", category: "motivation" },
  { id: 'm2', text: "Не ждите. Время никогда не будет «самым подходящим».", author: "Наполеон Хилл", category: "motivation" },
  { id: 'm3', text: "Действие — это основной ключ к успеху.", author: "Пабло Пикассо", category: "motivation" },
  { id: 'd1', text: "Дисциплина — это решение делать то, чего очень не хочется делать, чтобы достичь того, чего очень хочется достичь.", author: "Джон Максвелл", category: "discipline" },
  { id: 'd2', text: "Мы — это то, что мы делаем постоянно. Совершенство — это не действие, а привычка.", author: "Аристотель", category: "discipline" },
  { id: 'd3', text: "Мотивация заставляет вас начать. Привычка заставляет вас продолжать.", author: "Джим Рон", category: "discipline" },
  { id: 'd4', text: "Тяжело в учении — легко в бою.", author: "А.В. Суворов", category: "discipline" },
  { id: 'd5', text: "Боль дисциплины весит граммы, а боль сожаления весит тонны.", author: "Джим Рон", category: "discipline" },
  { id: 'm4', text: "Успех — это способность идти от неудачи к неудаче, не теряя энтузиазма.", author: "Уинстон Черчилль", category: "motivation" },
  { id: 'm5', text: "Ваше время ограничено, не тратьте его, живя чужой жизнью.", author: "Стив Джобс", category: "motivation" },

  // Mindfulness & Wisdom (10)
  { id: 'mi1', text: "Секрет перемен состоит в том, чтобы сосредоточить всю свою энергию не на борьбе со старым, а на создании нового.", author: "Сократ", category: "mindfulness" },
  { id: 'mi2', text: "Вчера я был умным, и поэтому я хотел изменить мир. Сегодня я стал мудрым, и поэтому я меняю себя.", author: "Джалаладдин Руми", category: "mindfulness" },
  { id: 'mi3', text: "Смотрите вглубь себя, и вы обнаружите, что не являетесь ни телом, ни разумом, а чем-то большим.", author: "Экхарт Толле", category: "mindfulness" },
  { id: 'mi4', text: "Жизнь — это то, что с вами случается, пока вы строите другие планы.", author: "Джон Леннон", category: "wisdom" },
  { id: 'mi5', text: "Кто смотрит наружу — спит; кто смотрит внутрь — просыпается.", author: "Карл Юнг", category: "wisdom" },
  { id: 'w1', text: "Знание говорит, а мудрость слушает.", author: "Джими Хендрикс", category: "wisdom" },
  { id: 'w2', text: "Свобода — это не то, что вам дали. Это то, что у вас нельзя отнять.", author: "Вольтер", category: "wisdom" },
  { id: 'w3', text: "Единственная истинная мудрость — в знании, что ты ничего не знаешь.", author: "Сократ", category: "wisdom" },
  { id: 'w4', text: "Не всё, что можно подсчитать, имеет значение, и не всё, что имеет значение, можно подсчитать.", author: "Альберт Эйнштейн", category: "wisdom" },
  { id: 'w5', text: "Спокойствие — это колыбель силы.", author: "Джозиа Гилберт Холланд", category: "mindfulness" },

  // Business & Creativity (10)
  { id: 'c1', text: "Вдохновение существует, но оно должно застать вас за работой.", author: "Пабло Пикассо", category: "creativity" },
  { id: 'c2', text: "Творчество требует смелости отказаться от уверенности.", author: "Эрих Фромм", category: "creativity" },
  { id: 'c3', text: "Не бойтесь совершенства. Вам его никогда не достичь.", author: "Сальвадор Дали", category: "creativity" },
  { id: 'b1', text: "Самый опасный яд — чувство достижения цели. Противоядие — каждый вечер думать, что можно сделать лучше завтра.", author: "Ингвар Кампрад", category: "business" },
  { id: 'b2', text: "Если вы не готовы ошибаться, вы никогда не придумаете ничего оригинального.", author: "Кен Робинсон", category: "business" },
  { id: 'b3', text: "Бизнес — это сочетание войны и спорта.", author: "Андре Моруа", category: "business" },
  { id: 'b4', text: "Успешные люди делают то, что неуспешные не хотят делать.", author: "Джон К. Максвелл", category: "business" },
  { id: 'b5', text: "Инновация отличает лидера от догоняющего.", author: "Стив Джобс", category: "business" },
  { id: 'c4', text: "Логика приведет вас из пункта А в пункт Б. Воображение приведет вас куда угодно.", author: "Альберт Эйнштейн", category: "creativity" },
  { id: 'c5', text: "Учите правила как профессионал, чтобы вы могли нарушать их как художник.", author: "Пабло Пикассо", category: "creativity" },

  // Leadership (5)
  { id: 'l1', text: "Лидерство — это искусство заставлять других хотеть сделать то, что нужно сделать.", author: "Дуайт Эйзенхауэр", category: "leadership" },
  { id: 'l2', text: "Менеджмент — это делать вещи правильно; лидерство — это делать правильные вещи.", author: "Питер Друкер", category: "leadership" },
  { id: 'l3', text: "Лучший лидер тот, о существовании которого люди едва знают.", author: "Лао-цзы", category: "leadership" },
  { id: 'l4', text: "Великие лидеры — это почти всегда великие упростители.", author: "Колин Пауэлл", category: "leadership" },
  { id: 'l5', text: "Не приказывай. Вдохновляй.", author: "Саймон Синек", category: "leadership" },
];

export const getRandomQuote = (): Quote => {
  const index = Math.floor(Math.random() * quotes.length);
  return quotes[index];
};

export const getAllQuotes = (): Quote[] => quotes;

export const getQuotesByCategory = (category: QuoteCategory | 'all'): Quote[] => {
    if (category === 'all') return quotes;
    return quotes.filter(q => q.category === category);
};

export const CATEGORIES: {id: QuoteCategory | 'all', label: string}[] = [
    { id: 'all', label: 'Все' },
    { id: 'stoicism', label: 'Стоицизм' },
    { id: 'discipline', label: 'Дисциплина' },
    { id: 'motivation', label: 'Мотивация' },
    { id: 'creativity', label: 'Творчество' },
    { id: 'mindfulness', label: 'Осознанность' },
    { id: 'wisdom', label: 'Мудрость' },
    { id: 'business', label: 'Дело' },
    { id: 'leadership', label: 'Лидерство' },
];
