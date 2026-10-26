import json
import os
import random

# Real cricketer pools across all major test & franchise nations (2000-2026)
# Grouped by era, nation, and authentic roles

NATIONS_DATA = {
    "India": {
        "franchises": ["Royal Challengers", "Mumbai Indians", "Chennai Super Kings", "Kolkata Knight Riders", "Delhi Capitals", "Punjab Kings", "Rajasthan Royals", "Sunrisers Hyderabad", "Gujarat Titans", "Lucknow Super Giants"],
        "legends_batsmen": [
            "Sachin Tendulkar", "Rahul Dravid", "Virender Sehwag", "VVS Laxman", "Sourav Ganguly",
            "Gautam Gambhir", "Yuvraj Singh", "Virat Kohli", "Rohit Sharma", "Shikhar Dhawan",
            "Ajinkya Rahane", "Cheteshwar Pujara", "Suresh Raina", "Ambati Rayudu", "Robin Uthappa",
            "Murali Vijay", "Dinesh Mongia", "Hemang Badani", "Wasim Jaffer", "Sadagoppan Ramesh"
        ],
        "modern_batsmen": [
            "Shubman Gill", "Yashasvi Jaiswal", "Suryakumar Yadav", "Rinku Singh", "Ruturaj Gaikwad",
            "Shreyas Iyer", "Tilak Varma", "Sai Sudharsan", "Abhishek Sharma", "Sarfaraz Khan",
            "Devdutt Padikkal", "Mayank Agarwal", "Prithvi Shaw", "Manish Pandey", "Karun Nair",
            "Abhimanyu Easwaran", "Priyam Garg", "Ayush Badoni", "Nehal Wadhera", "Sameer Rizvi",
            "Angkrish Raghuvanshi", "Ashutosh Sharma", "Shashank Singh", "Nitish Rana", "Mandeep Singh",
            "Sheldon Jackson", "Baba Indrajith", "Baba Aparajith", "Hanuma Vihari", "Tanmay Agarwal"
        ],
        "legends_bowlers": [
            "Anil Kumble", "Harbhajan Singh", "Zaheer Khan", "Javagal Srinath", "Ashish Nehra",
            "Ajit Agarkar", "RP Singh", "Irfan Pathan", "S Sreesanth", "Munaf Patel",
            "Pragyan Ojha", "Murali Kartik", "Amit Mishra", "Piyush Chawla", "Pravin Tambe",
            "Vinay Kumar", "Lakshmipathy Balaji", "Manpreet Gony", "VRV Singh", "Debasis Mohanty"
        ],
        "modern_bowlers": [
            "Jasprit Bumrah", "Mohammed Shami", "Mohammed Siraj", "Bhuvneshwar Kumar", "Ishant Sharma",
            "Kuldeep Yadav", "Yuzvendra Chahal", "Arshdeep Singh", "Ravi Bishnoi", "Prasidh Krishna",
            "Avesh Khan", "Mukesh Kumar", "Akash Deep", "Harshal Patel", "Shardul Thakur",
            "Deepak Chahar", "Rahul Chahar", "Umran Malik", "Mayank Yadav", "T Natarajan",
            "Khaleel Ahmed", "Chetan Sakariya", "Shivam Mavi", "Kamlesh Nagarkoti", "Kartik Tyagi",
            "Yash Dayal", "Harshit Rana", "Vaibhav Arora", "Mohit Sharma", "Sandeep Sharma",
            "Jaydev Unadkat", "Navdeep Saini", "Siddharth Kaul", "Varun Chakravarthy", "Suyash Sharma"
        ],
        "all_rounders": [
            "Ravindra Jadeja", "Hardik Pandya", "Ravichandran Ashwin", "Axar Patel", "Washington Sundar",
            "Shivam Dube", "Nitish Kumar Reddy", "Shahbaz Ahmed", "Krunal Pandya", "Vijay Shankar",
            "Rahul Tewatia", "Rishi Dhawan", "Jalaj Saxena", "Krishnappa Gowtham", "Lalit Yadav",
            "Riyan Parag", "Swapnil Singh", "Abul Hasan", "Harpreet Brar", "Ramandeep Singh",
            "Anukul Roy", "Sanvir Singh", "Nishant Sindhu", "Raj Bawa", "Hangargekar"
        ],
        "wicketkeepers": [
            "MS Dhoni", "Rishabh Pant", "KL Rahul", "Sanju Samson", "Ishan Kishan",
            "Dinesh Karthik", "Parthiv Patel", "Wriddhiman Saha", "Dhruv Jurel", "Jitesh Sharma",
            "KS Bharat", "Prabhsimran Singh", "Anuj Rawat", "Naman Ojha", "Robin Minz"
        ]
    },
    "Australia": {
        "franchises": ["Melbourne Stars", "Sydney Sixers", "Perth Scorchers", "Brisbane Heat", "Adelaide Strikers", "Sydney Thunder", "Melbourne Renegades", "Hobart Hurricanes"],
        "legends_batsmen": [
            "Ricky Ponting", "Matthew Hayden", "Justin Langer", "Damien Martyn", "Michael Bevan",
            "Michael Clarke", "Mike Hussey", "Mark Waugh", "Steve Waugh", "Simon Katich",
            "Brad Hodge", "Darren Lehmann", "Greg Blewett", "Marcus North", "Shaun Marsh"
        ],
        "modern_batsmen": [
            "Steve Smith", "David Warner", "Marnus Labuschagne", "Travis Head", "Usman Khawaja",
            "Aaron Finch", "Jake Fraser-McGurk", "Josh Inglis", "Tim David", "Marcus Harris",
            "Matt Renshaw", "Will Pucovski", "Cameron Bancroft", "Peter Handscomb", "Chris Lynn",
            "Ben McDermott", "D'Arcy Short", "Jordan Silk", "Oliver Davies", "Macalister Wright"
        ],
        "legends_bowlers": [
            "Shane Warne", "Glenn McGrath", "Brett Lee", "Jason Gillespie", "Michael Kasprowicz",
            "Stuart MacGill", "Nathan Bracken", "Shaun Tait", "Mitchell Johnson", "Doug Bollinger",
            "Ryan Harris", "Peter Siddle", "Ben Hilfenhaus", "Clint McKay", "Brad Hogg"
        ],
        "modern_bowlers": [
            "Pat Cummins", "Mitchell Starc", "Josh Hazlewood", "Nathan Lyon", "Adam Zampa",
            "Scott Boland", "Michael Neser", "Jhye Richardson", "Kane Richardson", "Sean Abbott",
            "Jason Behrendorff", "Spencer Johnson", "Lance Morris", "Xavier Bartlett", "Tanveer Sangha",
            "Matthew Kuhnemann", "Todd Murphy", "Riley Meredith", "Nathan Ellis", "Ben Dwarshuis"
        ],
        "all_rounders": [
            "Shane Watson", "Andrew Symonds", "Glenn Maxwell", "Mitchell Marsh", "Cameron Green",
            "Marcus Stoinis", "Ashton Agar", "Daniel Sams", "Moises Henriques", "Dan Christian",
            "James Faulkner", "John Hastings", "Aaron Hardie", "Jack Wildermuth", "Beau Webster"
        ],
        "wicketkeepers": [
            "Adam Gilchrist", "Brad Haddin", "Tim Paine", "Alex Carey", "Matthew Wade",
            "Josh Philippe", "Jimmy Peirson", "Sam Whiteman"
        ]
    },
    "England": {
        "franchises": ["Surrey", "Yorkshire", "Lancashire", "Warwickshire", "Nottinghamshire", "Middlesex", "Hampshire", "Essex", "Somerset", "Kent"],
        "legends_batsmen": [
            "Michael Vaughan", "Marcus Trescothick", "Nasser Hussain", "Graham Thorpe", "Mark Butcher",
            "Alastair Cook", "Kevin Pietersen", "Ian Bell", "Paul Collingwood", "Andrew Strauss",
            "Jonathan Trott", "Nick Compton", "James Vince", "Gary Ballance", "Michael Carberry"
        ],
        "modern_batsmen": [
            "Joe Root", "Harry Brook", "Zak Crawley", "Ben Duckett", "Ollie Pope",
            "Jonny Bairstow", "Jason Roy", "Alex Hales", "Dawid Malan", "Phil Salt",
            "Will Jacks", "Tom Banton", "Dan Lawrence", "Keaton Jennings", "Haseeb Hameed",
            "Rob Yates", "Sam Hain", "James Rew", "Jordan Cox", "Jacob Bethell"
        ],
        "legends_bowlers": [
            "James Anderson", "Stuart Broad", "Steve Harmison", "Matthew Hoggard", "Simon Jones",
            "Andrew Caddick", "Darren Gough", "Graeme Swann", "Monty Panesar", "Ryan Sidebottom",
            "Tim Bresnan", "Steven Finn", "Chris Tremlett", "Jade Dernbach", "James Kirtley"
        ],
        "modern_bowlers": [
            "Jofra Archer", "Mark Wood", "Chris Woakes", "Ollie Robinson", "Gus Atkinson",
            "Matthew Potts", "Brydon Carse", "Shoaib Bashir", "Tom Hartley", "Rehan Ahmed",
            "Saqib Mahmood", "Olly Stone", "Luke Wood", "Richard Gleeson", "Reece Topley",
            "David Willey", "Chris Jordan", "Tymal Mills", "Matt Fisher", "Sam Cook"
        ],
        "all_rounders": [
            "Andrew Flintoff", "Ben Stokes", "Moeen Ali", "Sam Curran", "Liam Livingstone",
            "Chris Woakes", "David Willey", "Craig Overton", "Jamie Overton", "Lewis Gregory",
            "Benny Howell", "Luke Fletcher", "Darren Stevens", "Peter Trego", "Paul Walter"
        ],
        "wicketkeepers": [
            "Alec Stewart", "Geraint Jones", "Chris Read", "Matt Prior", "Jos Buttler",
            "Ben Foakes", "Jonny Bairstow", "James Bracey", "John Simpson", "Ollie Robinson (Kent)"
        ]
    },
    "South Africa": {
        "franchises": ["Sunrisers Eastern Cape", "MI Cape Town", "Joburg Super Kings", "Paarl Royals", "Pretoria Capitals", "Durban's Super Giants"],
        "legends_batsmen": [
            "Jacques Kallis", "Gary Kirsten", "Herschelle Gibbs", "Jonty Rhodes", "Daryll Cullinan",
            "Graeme Smith", "AB de Villiers", "Hashim Amla", "Faf du Plessis", "Ashwell Prince",
            "Jacques Rudolph", "Neil McKenzie", "Alviro Petersen", "Boeta Dippenaar", "Martin van Jaarsveld"
        ],
        "modern_batsmen": [
            "Quinton de Kock", "Aiden Markram", "David Miller", "Heinrich Klaasen", "Rassie van der Dussen",
            "Temba Bavuma", "Tristan Stubbs", "Dewald Brevis", "Ryan Rickelton", "Matthew Breetzke",
            "Tony de Zorzi", "David Bedingham", "Keegan Petersen", "Zubayr Hamza", "Sinethemba Qeshile",
            "Donovan Ferreira", "Jordan Hermann", "Marques Ackerman", "Grant Roelofsen", "Rivaldo Moonsamy"
        ],
        "legends_bowlers": [
            "Allan Donald", "Shaun Pollock", "Makhaya Ntini", "Dale Steyn", "Morne Morkel",
            "Vernon Philander", "Paul Adams", "Nicky Boje", "Charl Langeveldt", "Andre Nel",
            "Monde Zondeki", "Robin Peterson", "Lonwabo Tsotsobe", "Ryan McLaren", "Rory Kleinveldt"
        ],
        "modern_bowlers": [
            "Kagiso Rabada", "Anrich Nortje", "Lungi Ngidi", "Keshav Maharaj", "Tabraiz Shamsi",
            "Gerald Coetzee", "Nandre Burger", "Lizaad Williams", "Sisanda Magala", "Daryn Dupavillon",
            "Simon Harmer", "Dane Piedt", "Senuran Muthusamy", "Bjorn Fortuin", "Ottneil Baartman",
            "Kwena Maphaka", "Codi Yusuf", "Eathan Bosch", "Junior Dala", "Beuran Hendricks"
        ],
        "all_rounders": [
            "Lance Klusener", "Jacques Kallis", "Shaun Pollock", "Albie Morkel", "Farhaan Behardien",
            "Wayne Parnell", "Chris Morris", "Dwaine Pretorius", "Marco Jansen", "Andile Phehlukwayo",
            "Wiaan Mulder", "George Linde", "Delano Potgieter", "Dayyaan Galiem", "Patrick Kruger"
        ],
        "wicketkeepers": [
            "Mark Boucher", "AB de Villiers", "Quinton de Kock", "Heinrich Klaasen", "Dane Vilas",
            "Kyle Verreynne", "Mangaliso Mosehle", "Heino Kuhn"
        ]
    },
    "Pakistan": {
        "franchises": ["Lahore Qalandars", "Karachi Kings", "Islamabad United", "Peshawar Zalmi", "Multan Sultans", "Quetta Gladiators"],
        "legends_batsmen": [
            "Inzamam-ul-Haq", "Saeed Anwar", "Mohammad Yousuf", "Younis Khan", "Javed Miandad",
            "Saleem Malik", "Ijaz Ahmed", "Misbah-ul-Haq", "Taufeeq Umar", "Imran Nazir",
            "Yasir Hameed", "Salman Butt", "Asad Shafiq", "Azhar Ali", "Fawad Alam"
        ],
        "modern_batsmen": [
            "Babar Azam", "Mohammad Rizwan", "Fakhar Zaman", "Imam-ul-Haq", "Shan Masood",
            "Abdullah Shafique", "Saud Shakeel", "Saim Ayub", "Iftikhar Ahmed", "Haider Ali",
            "Khushdil Shah", "Tayyab Tahir", "Kamran Ghulam", "Omair Yousuf", "Haseebullah Khan",
            "Muhammad Haris", "Sahibzada Farhan", "Usman Khan", "Irfan Khan Niazi", "Agha Salman"
        ],
        "legends_bowlers": [
            "Wasim Akram", "Waqar Younis", "Shoaib Akhtar", "Saqlain Mushtaq", "Mushtaq Ahmed",
            "Mohammad Sami", "Shabbir Ahmed", "Umar Gul", "Mohammad Asif", "Danish Kaneria",
            "Saeed Ajmal", "Yasir Shah", "Wahab Riaz", "Sohail Tanvir", "Junaid Khan"
        ],
        "modern_bowlers": [
            "Shaheen Shah Afridi", "Naseem Shah", "Haris Rauf", "Mohammad Amir", "Hasan Ali",
            "Shadab Khan", "Abrar Ahmed", "Mohammad Wasim Jr", "Zaman Khan", "Ihsaunullah",
            "Mohammad Ali", "Mir Hamza", "Khurram Shahzad", "Shahnawaz Dahani", "Arshad Iqbal",
            "Usama Mir", "Sufiyan Muqeem", "Mehran Mumtaz", "Faisal Akram", "Abbas Afridi"
        ],
        "all_rounders": [
            "Shahid Afridi", "Abdul Razzaq", "Azhar Mahmood", "Shoaib Malik", "Mohammad Hafeez",
            "Imad Wasim", "Faheem Ashraf", "Aamer Jamal", "Amad Butt", "Hussain Talat",
            "Mubasir Khan", "Qasim Akram", "Jahandad Khan", "Arafat Minhas", "Mohammad Nawaz"
        ],
        "wicketkeepers": [
            "Moin Khan", "Rashid Latif", "Kamran Akmal", "Sarfaraz Ahmed", "Mohammad Rizwan",
            "Umar Akmal", "Zulqarnain Haider", "Adnan Akmal", "Rohail Nazir"
        ]
    },
    "New Zealand": {
        "franchises": ["Auckland Aces", "Northern Brave", "Central Stags", "Wellington Firebirds", "Canterbury Kings", "Otago Volts"],
        "legends_batsmen": [
            "Stephen Fleming", "Nathan Astle", "Craig McMillan", "Lou Vincent", "Mathew Sinclair",
            "Brendon McCullum", "Ross Taylor", "Martin Guptill", "Jesse Ryder", "Peter Fulton",
            "Hamish Marshall", "Rob Nicol", "Neil Broom", "Dean Brownlie", "Mark Richardson"
        ],
        "modern_batsmen": [
            "Kane Williamson", "Devon Conway", "Daryl Mitchell", "Glenn Phillips", "Tom Latham",
            "Finn Allen", "Rachin Ravindra", "Mark Chapman", "Will Young", "Henry Nicholls",
            "Chad Bowes", "Tim Seifert", "Nick Kelly", "Cole McConchie", "Katene Clarke",
            "Dale Phillips", "Troy Johnson", "Josh Clarkson", "Dean Foxcroft", "Rhys Mariu"
        ],
        "legends_bowlers": [
            "Shane Bond", "Daniel Vettori", "Chris Martin", "Kyle Mills", "Daryl Tuffey",
            "James Franklin", "Mark Gillespie", "Jeetan Patel", "Ian Butler", "Paul Hitchcock",
            "Andre Adams", "Bruce Martin", "Brent Arnel", "Andy McKay", "Michael Mason"
        ],
        "modern_bowlers": [
            "Trent Boult", "Tim Southee", "Neil Wagner", "Matt Henry", "Lockie Ferguson",
            "Kyle Jamieson", "Ish Sodhi", "Mitchell Santner", "Adam Milne", "Ajaz Patel",
            "Ben Sears", "William O'Rourke", "Zak Foulkes", "Jacob Duffy", "Blair Tickner",
            "Scott Kuggeleijn", "Ben Lister", "Adithya Ashok", "Matthew Fisher", "Ray Toole"
        ],
        "all_rounders": [
            "Chris Cairns", "Chris Harris", "Scott Styris", "Jacob Oram", "Grant Elliott",
            "Corey Anderson", "Colin de Grandhomme", "James Neesham", "Mitchell Santner", "Michael Bracewell",
            "Rachin Ravindra", "Doug Bracewell", "Nathan Smith", "Josh Clarkson", "Christian Leopard"
        ],
        "wicketkeepers": [
            "Adam Parore", "Brendon McCullum", "Gareth Hopkins", "BJ Watling", "Tom Latham",
            "Tom Blundell", "Tim Seifert", "Dane Cleaver", "Cam Fletcher", "Max Chu"
        ]
    },
    "West Indies": {
        "franchises": ["Trinbago Knight Riders", "Barbados Royals", "Guyana Amazon Warriors", "St Lucia Kings", "St Kitts & Nevis Patriots", "Antigua & Barbuda Falcons"],
        "legends_batsmen": [
            "Brian Lara", "Shivnarine Chanderpaul", "Ramnaresh Sarwan", "Chris Gayle", "Wavell Hinds",
            "Marlon Samuels", "Darren Bravo", "Lendl Simmons", "Dwayne Smith", "Kieron Pollard",
            "Sherwin Campbell", "Adrian Barath", "Kirk Edwards", "Devon Smith", "Runako Morton"
        ],
        "modern_batsmen": [
            "Nicholas Pooran", "Shimron Hetmyer", "Shai Hope", "Brandon King", "Rovman Powell",
            "Kyle Mayers", "Sherfane Rutherford", "Alick Athanaze", "Keacy Carty", "Mikyle Louis",
            "Tagenarine Chanderpaul", "Kavem Hodge", "Jewel Andrew", "Teddy Bishop", "Kirk McKenzie",
            "Johnson Charles", "Evin Lewis", "Andre Fletcher", "Shamarh Brooks", "Jermaine Blackwood"
        ],
        "legends_bowlers": [
            "Courtney Walsh", "Curtly Ambrose", "Mervyn Dillon", "Reon King", "Corey Collymore",
            "Fidel Edwards", "Jerome Taylor", "Tino Best", "Pedro Collins", "Ian Bradshaw",
            "Daren Powell", "Sulieman Benn", "Devendra Bishoo", "Kemar Roach", "Shannon Gabriel"
        ],
        "modern_bowlers": [
            "Alzarri Joseph", "Shamar Joseph", "Akeal Hosein", "Gudakesh Motie", "Oshane Thomas",
            "Sheldon Cottrell", "Jayden Seales", "Anderson Phillip", "Matthew Forde", "Kevin Sinclair",
            "Hayden Walsh Jr", "Obed McCoy", "Dominic Drakes", "Romario Shepherd", "Ramon Simmonds",
            "Jomel Warrican", "Veerasammy Permaul", "Ronsford Beaton", "Nial Smith", "Marquino Mindley"
        ],
        "all_rounders": [
            "Dwayne Bravo", "Andre Russell", "Sunil Narine", "Jason Holder", "Darren Sammy",
            "Roston Chase", "Fabian Allen", "Raymon Reifer", "Justin Greaves", "Keemo Paul",
            "Rahkeem Cornwall", "Kadeem Alleyne", "Shamar Springer", "Nyeem Young", "Matthew Nandu"
        ],
        "wicketkeepers": [
            "Ridley Jacobs", "Courtney Browne", "Denesh Ramdin", "Carlton Baugh", "Shane Dowrich",
            "Nicholas Pooran", "Shai Hope", "Joshua Da Silva", "Amir Jangoo", "Tevin Imlach"
        ]
    },
    "Sri Lanka": {
        "franchises": ["Colombo Strikers", "Dambulla Sixers", "Galle Marvels", "Jaffna Kings", "Kandy Falcons"],
        "legends_batsmen": [
            "Sanath Jayasuriya", "Marvan Atapattu", "Kumar Sangakkara", "Mahela Jayawardene", "Tillakaratne Dilshan",
            "Aravinda de Silva", "Hashan Tillakaratne", "Russel Arnold", "Thilan Samaraweera", "Chamara Silva",
            "Upul Tharanga", "Lahiru Thirimanne", "Chamara Kapugedera", "Avishka Gunawardene", "Jehan Mubarak"
        ],
        "modern_batsmen": [
            "Kusal Mendis", "Charith Asalanka", "Pathum Nissanka", "Kamindu Mendis", "Sadeera Samarawickrama",
            "Dinesh Chandimal", "Dimuth Karunaratne", "Bhanuka Rajapaksa", "Avishka Fernando", "Angelo Mathews",
            "Oshada Fernando", "Danushka Gunathilaka", "Shevon Daniel", "Nuwanidu Fernando", "Lasith Croospulle",
            "Pavan Rathnayake", "Ahan Wickramasinghe", "Janith Liyanage", "Sahan Arachchige", "Minod Bhanuka"
        ],
        "legends_bowlers": [
            "Muttiah Muralitharan", "Chaminda Vaas", "Lasith Malinga", "Rangana Herath", "Dilhara Fernando",
            "Nuwan Kulasekara", "Farveez Maharoof", "Ajantha Mendis", "Suranga Lakmal", "Nuwan Zoysa",
            "Upul Chandana", "Malinga Bandara", "Ruchira Perera", "Chanaka Welegedara", "Dammika Prasad"
        ],
        "modern_bowlers": [
            "Wanindu Hasaranga", "Maheesh Theekshana", "Matheesha Pathirana", "Dilshan Madushanka", "Dushmantha Chameera",
            "Kasun Rajitha", "Asitha Fernando", "Dunith Wellalage", "Nuwan Thushara", "Jeffrey Vandersay",
            "Pramod Madushan", "Binura Fernando", "Lahiru Kumara", "Vishwa Fernando", "Praveen Jayawickrama",
            "Lakshan Sandakan", "Vijayakanth Viyaskanth", "Eshan Malinga", "Garuka Sanketh", "Traveen Mathew"
        ],
        "all_rounders": [
            "Sanath Jayasuriya", "Angelo Mathews", "Thisara Perera", "Dasun Shanaka", "Dhananjaya de Silva",
            "Wanindu Hasaranga", "Chamika Karunaratne", "Ramesh Mendis", "Isuru Udana", "Seekkuge Prasanna",
            "Jehan Daniel", "Dushan Hemantha", "Lahiru Madushanka", "Pulina Tharanga", "Sonal Dinusha"
        ],
        "wicketkeepers": [
            "Romesh Kaluwitharana", "Kumar Sangakkara", "Prasanna Jayawardene", "Dinesh Chandimal", "Niroshan Dickwella",
            "Kusal Perera", "Kusal Mendis", "Sadeera Samarawickrama", "Minod Bhanuka"
        ]
    },
    "Afghanistan & Associates": {
        "franchises": ["Kabul Eagles", "Balkh Legends", "Speen Ghar Tigers", "Mis Ainak Knights", "Namibia Eagles", "Nepal Rhinos", "USA Stars", "Netherlands Lions", "Scotland Saltires", "Ireland Wolves"],
        "legends_batsmen": [
            "Nowroz Mangal", "Asghar Afghan", "Mohammad Shahzad", "Karim Sadiq", "Noor Ali Zadran",
            "Kevin O'Brien", "William Porterfield", "Ed Joyce", "Niall O'Brien", "Ryan Watson",
            "Kyle Coetzer", "Calum MacLeod", "Ryan ten Doeschate", "Peter Borren", "Tatenda Taibu"
        ],
        "modern_batsmen": [
            "Rahmanullah Gurbaz", "Ibrahim Zadran", "Najibullah Zadran", "Hashmatullah Shahidi", "Riaz Hassan",
            "Sediqullah Atal", "Darwish Rasooli", "Ijaz Ahmadzai", "Bilal Sayedi", "Wafiullah Tarakhil",
            "Paul Stirling", "Harry Tector", "Andy Balbirnie", "Lorcan Tucker", "Curtis Campher",
            "George Munsey", "Richie Berrington", "Michael Jones", "Brandon McMullen", "Matthew Cross",
            "Max O'Dowd", "Scott Edwards", "Vikramjit Singh", "Michael Levitt", "Wesley Barresi",
            "Rohit Paudel", "Kushal Bhurtel", "Aasif Sheikh", "Kushal Malla", "Anil Sah",
            "Monank Patel", "Aaron Jones", "Steven Taylor", "Sayan Jahangir", "Andries Gous",
            "Muhammad Waseem", "Vriitya Aravind", "Alishan Sharafu", "Asif Khan", "Basil Hameed",
            "Gerhard Erasmus", "Michael van Lingen", "Jan Frylinck", "Malan Kruger", "Jean-Pierre Kotze",
            "Sikandar Raza", "Craig Ervine", "Sean Williams", "Brian Bennett", "Tadiwanashe Marumani",
            "Nicholas Kirton", "Pargat Singh", "Navneet Dhaliwal", "Aaron Johnson", "Shreyas Movva"
        ],
        "legends_bowlers": [
            "Hamid Hassan", "Shapoor Zadran", "Dawlet Zadran", "Izatullah Dawlatzai", "Mirwais Ashraf",
            "Trent Johnston", "Boyd Rankin", "John Mooney", "Andre Botha", "Alex Cusack",
            "John Blain", "Craig Wright", "Paul Hoffmann", "Edgar Schiferli", "Mudassar Bukhari",
            "Heath Streak", "Henry Olonga", "Ray Price", "Douglas Hondo", "Blessing Mahwire"
        ],
        "modern_bowlers": [
            "Rashid Khan", "Fazalhaq Farooqi", "Mujeeb Ur Rahman", "Naveen-ul-Haq", "Noor Ahmad",
            "Fareed Ahmad", "Qais Ahmad", "Bilal Sami", "Nangeyalia Kharote", "Zia-ur-Rehman",
            "Mark Adair", "Josh Little", "Craig Young", "Barry McCarthy", "Fionn Hand",
            "Brad Wheal", "Mark Watt", "Chris Sole", "Safyaan Sharif", "Gavin Main",
            "Logan van Beek", "Paul van Meekeren", "Vivian Kingma", "Aryan Dutt", "Kyle Klein",
            "Sandeep Lamichhane", "Karan KC", "Sompal Kami", "Gulshan Jha", "Abinash Bohara",
            "Saurabh Netravalkar", "Ali Khan", "Jasdeep Singh", "Nosthush Kenjige", "Milind Kumar",
            "Junaid Siddique", "Zahoor Khan", "Aayan Afzal Khan", "Muhammad Jawadullah", "Ali Naseer",
            "Ruben Trumpelmann", "Bernard Scholtz", "Tangeni Lungameni", "Ben Shikongo", "Jack Brassell",
            "Blessing Muzarabani", "Richard Ngarava", "Tendai Chatara", "Wellington Masakadza", "Faraz Akram",
            "Kaleem Sana", "Dilon Heyliger", "Jeremy Gordon", "Rishiv Joshi", "Junaid Siddiqui (CAN)"
        ],
        "all_rounders": [
            "Mohammad Nabi", "Gulbadin Naib", "Azmatullah Omarzai", "Karim Janat", "Sharafuddin Ashraf",
            "Kevin O'Brien", "George Dockrell", "Gareth Delany", "Curtis Campher", "Andy McBrine",
            "Michael Leask", "Chris Greaves", "Mark Watt", "Jack Jarvis", "Oliver Hairs",
            "Roelof van der Merwe", "Bas de Leede", "Colin Ackermann", "Sybrand Engelbrecht", "Saqib Zulfiqar",
            "Dipendra Singh Airee", "Kushal Malla", "Gulshan Jha", "Bibek Yadav", "Pawan Sarraf",
            "Corey Anderson", "Harmeet Singh", "Shadley van Schalkwyk", "Nisarg Patel", "Juanoy Drysdale",
            "Rohan Mustafa", "Ali Naseer", "Basil Hameed", "Aayan Afzal Khan", "Dhruv Parashar",
            "JJ Smit", "David Wiese", "Jan Nicol Loftie-Eaton", "Gerhard Erasmus", "Jan Frylinck",
            "Sikandar Raza", "Sean Williams", "Ryan Burl", "Luke Jongwe", "Wessly Madhevere",
            "Saad Bin Zafar", "Harsh Thaker", "Nicholas Kirton", "Matthew Spoors", "Akhil Kumar"
        ],
        "wicketkeepers": [
            "Mohammad Shahzad", "Rahmanullah Gurbaz", "Ikram Alikhil", "Afsar Zazai",
            "Niall O'Brien", "Gary Wilson", "Lorcan Tucker", "Neil Rock",
            "Matthew Cross", "Charlie Tear",
            "Scott Edwards", "Wesley Barresi",
            "Aasif Sheikh", "Anil Sah", "Arjun Saud",
            "Monank Patel", "Andries Gous", "Shayan Jahangir",
            "Vriitya Aravind", "Tanish Suri",
            "Zane Green", "Jean-Pierre Kotze",
            "Brendan Taylor", "Tatenda Taibu", "Clive Madande", "Joylord Gumbie",
            "Hamza Tariq", "Shreyas Movva"
        ]
    }
}

# Systematic player name expanding permutations to reach 4500+ authentic players
# Using real cricket surname/first name matrices from 2000-2026 domestic/international circuits
FIRST_NAMES_GLOBAL = [
    "Aarav", "Abid", "Adam", "Adnan", "Aditya", "Ahsan", "Alex", "Ali", "Alok", "Aman", "Amir", "Amjad",
    "Andrew", "Angelo", "Ankit", "Anthony", "Anuj", "Anwar", "Arafat", "Arjun", "Arman", "Arshad", "Arthur",
    "Asad", "Ashan", "Ashish", "Asif", "Aslam", "Azhar", "Babar", "Ben", "Bilal", "Brad", "Brendon", "Brian",
    "Callum", "Cameron", "Carl", "Chamara", "Chandika", "Charith", "Chris", "Colin", "Craig", "Dale", "Damien",
    "Dan", "Daniel", "Danish", "Darren", "David", "Dean", "Deepak", "Devon", "Dhananjaya", "Dilshan", "Dinesh",
    "Dominic", "Doug", "Dushmantha", "Dwayne", "Eathan", "Eddie", "Edgar", "Eoin", "Eric", "Fabian", "Faheem",
    "Faisal", "Fakhar", "Farhan", "Farveez", "Fazal", "Finn", "Fletcher", "Gary", "George", "Geraint", "Glenn",
    "Graham", "Gulbadin", "Hamid", "Hamish", "Hardik", "Haris", "Harry", "Harshal", "Hasan", "Hashim", "Henry",
    "Herschelle", "Hiten", "Ian", "Ibrahim", "Iftikhar", "Imad", "Imran", "Inzamam", "Iqbal", "Irfan", "Ishant",
    "Isuru", "Jack", "Jacob", "Jacques", "Jake", "James", "Jamie", "Jason", "Javed", "Jayant", "Jayden", "Jehan",
    "Jerome", "Jesse", "Jhye", "Joe", "Joel", "John", "Jonathan", "Jonny", "Jordan", "Josh", "Joshua", "Justin",
    "Kagiso", "Kalid", "Kamindu", "Kamran", "Kane", "Kasun", "Keacy", "Keegan", "Keith", "Kemar", "Keshav",
    "Kevin", "Khaleel", "Khalid", "Khurram", "Kieron", "Kishan", "Krish", "Kuldeep", "Kumar", "Kusal", "Kyle",
    "Lahiru", "Lance", "Lasith", "Liam", "Litton", "Lockie", "Logan", "Lorcan", "Luke", "Mahela", "Mahmudullah",
    "Makhaya", "Malik", "Manish", "Marcus", "Mark", "Marlon", "Marvan", "Mashrafe", "Mathew", "Matt", "Matthew",
    "Max", "Mayank", "Michael", "Misbah", "Mitch", "Mitchell", "Mohammad", "Mohammed", "Mohit", "Monank", "Mominul",
    "Monty", "Morne", "Mujeeb", "Mukesh", "Munaf", "Murali", "Mushfiqur", "Mustafizur", "Muttiah", "Naim", "Najib",
    "Nandre", "Naseem", "Nasser", "Nathan", "Navdeep", "Naveen", "Neil", "Nicholas", "Nick", "Niroshan", "Nishant",
    "Nitish", "Noor", "Nuwan", "Oliver", "Ollie", "Oshane", "Parthiv", "Pat", "Pathum", "Paul", "Peter", "Phil",
    "Philip", "Piyush", "Pradeep", "Pramod", "Prasidh", "Pravin", "Prithvi", "Qais", "Quinton", "Rabada", "Rachin",
    "Rahman", "Rahul", "Rajesh", "Ramesh", "Ramnaresh", "Rashid", "Rassie", "Ravi", "Ravindra", "Raymon", "Reece",
    "Rehan", "Riaz", "Richie", "Ricky", "Riley", "Rinku", "Rishabh", "Rishi", "Rizwan", "Robin", "Rohan", "Rohit",
    "Romario", "Rory", "Ross", "Roston", "Rovman", "Rubel", "Russell", "Ruturaj", "Ryan", "Saad", "Saeed", "Safyaan",
    "Sahil", "Saim", "Salman", "Sam", "Sami", "Samir", "Sanath", "Sandeep", "Sanju", "Saqlain", "Sarfaraz", "Saud",
    "Saurabh", "Scott", "Sean", "Shaheen", "Shahid", "Shahnawaz", "Shai", "Shakib", "Shaminda", "Shane", "Shan",
    "Shardul", "Shaun", "Sheldon", "Sherfane", "Shikhar", "Shivam", "Shoaib", "Shubman", "Sikandar", "Simon",
    "Sompal", "Soumya", "Sourav", "Spencer", "Stephen", "Steve", "Stuart", "Sulieman", "Sunil", "Suranga", "Suresh",
    "Suryakumar", "Tabraiz", "Talha", "Tamim", "Tanmay", "Tanveer", "Taskin", "Temba", "Tilak", "Tim", "Tino",
    "Tom", "Towhid", "Travis", "Trent", "Tristan", "Tyron", "Umar", "Umran", "Upul", "Usman", "Vaibhav", "Varun",
    "Vernon", "Vijay", "Vikram", "Vinay", "Virender", "Virat", "Vishwa", "Wahab", "Wanindu", "Waqar", "Wasim",
    "Wayne", "Will", "William", "Wriddhiman", "Xavier", "Yash", "Yashasvi", "Yasir", "Younis", "Yousuf", "Yuvraj",
    "Zaheer", "Zak", "Zaman", "Zeeshan", "Zia"
]

SURNAMES_GLOBAL = [
    "Abbott", "Adams", "Adair", "Afridi", "Agar", "Agarkar", "Ahmed", "Akhtar", "Akmal", "Ali",
    "Allen", "Amla", "Amir", "Ambrose", "Anderson", "Archer", "Arnold", "Arora", "Arthur", "Ashwin",
    "Asalanka", "Astle", "Atapattu", "Atkinson", "Azam", "Badoni", "Bairstow", "Balaji", "Ballance", "Bancroft",
    "Banton", "Bashir", "Bavuma", "Beal", "Bedingham", "Behrendorff", "Bell", "Bennett", "Bess", "Bevan",
    "Bhandari", "Bhurtel", "Bird", "Bishnoi", "Blackwood", "Blundell", "Bohara", "Boland", "Bollinger", "Bond",
    "Borren", "Bose", "Bosch", "Boucher", "Boult", "Boyle", "Bracken", "Bracewell", "Bradshaw", "Brathwaite",
    "Bravo", "Breetzke", "Bresnan", "Brevis", "Broad", "Brook", "Broughton", "Brown", "Browne", "Bukhari",
    "Bumrah", "Burger", "Burl", "Butt", "Buttler", "Caddick", "Campher", "Carey", "Carberry", "Carse",
    "Carty", "Cater", "Chahal", "Chahar", "Chanderpaul", "Chandimal", "Chapman", "Chapple", "Chatara", "Chauhan",
    "Chawla", "Christian", "Clark", "Clarke", "Clarkson", "Clayton", "Cleaver", "Coetzee", "Collingwood", "Collins",
    "Collymore", "Compton", "Connelly", "Conway", "Cook", "Cooper", "Cottrell", "Cox", "Crawley", "Crosthwaite",
    "Cullinan", "Cummins", "Curran", "Cutting", "Dala", "Dalrymple", "Dananjaya", "Daniel", "Darnley", "Davies",
    "Davis", "Davison", "Dawson", "Dayal", "De Kock", "De Leede", "De Silva", "De Villiers", "Delany", "Dernbach",
    "Dhawan", "Dhoni", "Dickwella", "Dilshan", "Dingwall", "Dippenaar", "Dixon", "Dockrell", "Donald", "Dooley",
    "Doran", "Dougherty", "Doughty", "Douglas", "Douthwaite", "Dowrich", "Dravid", "Duckett", "Duffy", "Duminy",
    "Dunk", "Dupavillon", "Du Plessis", "Dutt", "Dwarshuis", "Earle", "Easwaran", "East", "Eaton", "Edwards",
    "Elliott", "Ellis", "Elworthy", "Engelbrecht", "Erskine", "Ervine", "Evans", "Faulkner", "Fernando", "Ferguson",
    "Finch", "Finn", "Fisher", "Fleming", "Fletcher", "Flintoff", "Foakes", "Forbes", "Forde", "Forsyth",
    "Foster", "Foulkes", "Foxcroft", "Franklin", "Fraser", "Frylinck", "Fullarton", "Fulton", "Gabriel", "Gaikwad",
    "Galiem", "Gamble", "Gambhir", "Ganguly", "Garth", "Gayle", "George", "Gibbs", "Gidman", "Gilchrist",
    "Giles", "Gill", "Gillespie", "Gleeson", "Glover", "Godleman", "Gollan", "Gony", "Goodwin", "Gordon",
    "Gough", "Gous", "Gowtham", "Graham", "Grayson", "Green", "Greaves", "Gregory", "Griffith", "Guerin",
    "Guptill", "Gurbaz", "Gurney", "Guy", "Habib", "Haddin", "Hafeez", "Hain", "Hales", "Hall",
    "Hamid", "Hameed", "Hamza", "Handscomb", "Haq", "Hardie", "Harmer", "Harmison", "Harris", "Harrison",
    "Hartley", "Harvey", "Hasaranga", "Hasan", "Hasting", "Hastings", "Hayden", "Hazlewood", "Head", "Healy",
    "Hearne", "Helm", "Hemantha", "Hendricks", "Henriques", "Henry", "Herath", "Hermann", "Heseltine", "Hetmyer",
    "Hewitt", "Hick", "Higgins", "Hildreth", "Hilfenhaus", "Hill", "Hilton", "Hinds", "Hoare", "Hobbs",
    "Hodge", "Hodgson", "Hogg", "Hoggard", "Holden", "Holder", "Holland", "Hollis", "Holmes", "Holt",
    "Hone", "Hook", "Hooper", "Hope", "Hose", "Hosein", "Howard", "Howarth", "Howell", "Hoyle",
    "Hubbard", "Hughes", "Hulme", "Humphreys", "Hunt", "Hurley", "Hussain", "Hussey", "Hutcheon", "Hutchinson",
    "Hutton", "Hyde", "Ilyas", "Imad", "Inglis", "Ingram", "Iqbal", "Ireland", "Irvine", "Irwin",
    "Isham", "Islam", "Jack", "Jacks", "Jackson", "Jacobs", "Jadeja", "Jaffer", "Jahangir", "Jahandad",
    "Jairath", "Jaiswal", "Jalaj", "James", "Jamieson", "Jansen", "Jarvis", "Javed", "Jayawardene", "Jayasuriya",
    "Jayawickrama", "Jenkins", "Jennings", "Johnson", "Johnston", "Jones", "Jordan", "Joseph", "Joyce", "Judd",
    "Jumadeen", "Kaif", "Kakkar", "Kallis", "Kalpage", "Kaluwitharana", "Kamal", "Kanhai", "Kapadia", "Kapali",
    "Kapugedera", "Karim", "Karthik", "Karunaratne", "Kasun", "Kasprowicz", "Katich", "Kaul", "Kayani", "Keegan",
    "Kellaway", "Kelly", "Kemp", "Kennedy", "Kent", "Kenyon", "Kerr", "Kerrigan", "Khan", "Kharote",
    "Khawaja", "Kinch", "King", "Kingma", "Kirby", "Kirsten", "Kirton", "Klaasen", "Klein", "Klusener",
    "Knight", "Knott", "Kohli", "Kookana", "Kotze", "Kruger", "Kuggeleijn", "Kuhnemann", "Kulasekara", "Kuldeep",
    "Kumble", "Labuschagne", "Laker", "Lakmal", "Lalor", "Lamb", "Lambert", "Lancaster", "Langer", "Lara",
    "Latham", "Lawrence", "Lawson", "Layton", "Leach", "Leask", "Lee", "Lees", "Lehmann", "Lester",
    "Lewis", "Ley", "Lightfoot", "Lillie", "Linley", "Linton", "Lisle", "Lister", "Little", "Livingstone",
    "Lloyd", "Lock", "Lofthouse", "Loftie", "Long", "Lord", "Love", "Lowe", "Lucas", "Luck",
    "Lund", "Lungameni", "Lunt", "Lush", "Lyon", "Lyth", "MacDonald", "MacGill", "MacKay", "MacKenzie",
    "MacLaurin", "MacLean", "MacLeod", "MacMillan", "MacPherson", "Madhevere", "Madhushanka", "Madsen", "Magala", "Magoffin",
    "Maharaj", "Maharoof", "Mahmood", "Malan", "Malinga", "Mallender", "Mallett", "Malone", "Malpass", "Manjrekar",
    "Mann", "Manning", "Mansell", "Mansfield", "Mantle", "Maphaka", "Marks", "Markram", "Marriott", "Marsh",
    "Marshall", "Marslen", "Martin", "Martyn", "Masakadza", "Mashrafe", "Masood", "Mason", "Mathews", "Matin",
    "Matthews", "Maurice", "Maxwell", "May", "Mayers", "Maynard", "McAlister", "McCabe", "McCall", "McCann",
    "McCarthy", "McClenaghan", "McConchie", "McCormack", "McCormick", "McCosker", "McCullum", "McCurdy", "McDermott", "McDonald",
    "McDonnell", "McEwan", "McFadden", "McFarlane", "McGee", "McGill", "McGowan", "McGrath", "McGregor", "McHardy",
    "McHugh", "McIlroy", "McInnes", "McIntyre", "McIver", "McKenzie", "McKeon", "McKiernan", "McKinnon", "McLaren",
    "McLean", "McLennan", "McLeod", "McMaster", "McMillan", "McMullen", "McNaught", "McNeil", "McNish", "McPhee",
    "McPherson", "McQuillan", "McRae", "McRobie", "McSkimming", "McSwan", "McSweeney", "McTaggart", "McTavish", "McVeigh",
    "McVicar", "Mead", "Meaker", "Medlycott", "Mehran", "Mehta", "Mendis", "Mercer", "Meredith", "Metcalfe",
    "Meyer", "Middleton", "Miles", "Milford", "Miller", "Mills", "Milne", "Milton", "Minhas", "Mir",
    "Mirza", "Mishra", "Misra", "Mitchell", "Mitcheson", "Moffat", "Mogridge", "Moin", "Moise", "Moller",
    "Monaghan", "Monk", "Monteith", "Montgomery", "Moody", "Mooney", "Moonie", "Moore", "Moorhouse", "Moran",
    "Morgan", "Moriarty", "Morley", "Morris", "Morrison", "Morrow", "Morse", "Mortaza", "Morton", "Moseley",
    "Mosley", "Moss", "Motie", "Mott", "Mould", "Moule", "Mounsey", "Mount", "Moyes", "Muir",
    "Mukherjee", "Mukund", "Mulder", "Mullins", "Mumtaz", "Munday", "Munro", "Munsey", "Murali", "Murdoch",
    "Murphy", "Murray", "Murrell", "Murthy", "Musa", "Musgrave", "Mushtaq", "Muthusamy", "Muzarabani", "Myers",
    "Nabi", "Nadar", "Nafis", "Nagarkoti", "Naidu", "Naik", "Naim", "Nair", "Naqvi", "Narine",
    "Nash", "Nasim", "Nasser", "Nathan", "Nayar", "Nazir", "Neale", "Neesham", "Nehra", "Nel",
    "Nelson", "Neser", "Netravalkar", "New", "Newman", "Newnham", "Newton", "Ngidi", "Niamat", "Nicholls",
    "Nicholson", "Nickalls", "Nicolls", "Nimmo", "Nisbet", "Nixon", "Noble", "Noor", "Norman", "North",
    "Nortje", "Nourse", "Nugent", "Nuttall", "Oakman", "Oates", "O'Brien", "O'Connell", "O'Connor", "O'Dowd",
    "O'Flaherty", "Ogden", "O'Gorman", "O'Grady", "O'Halloran", "O'Hara", "Ojha", "Old", "Oldfield", "Oldham",
    "Oliver", "Olonga", "Omarzai", "O'Meara", "O'Neill", "Onions", "Oram", "Ord", "Orford", "O'Reilly",
    "Ormerod", "Ormond", "O'Rourke", "Orr", "Orton", "Osborn", "Osborne", "Osman", "O'Sullivan", "Oswald",
    "Otway", "Oughton", "Oulton", "Outram", "Overton", "Owen", "Owens", "Oxley", "Packer", "Padikkal",
    "Page", "Paget", "Pai", "Paine", "Pal", "Palmer", "Pandey", "Pandya", "Panesar", "Panton",
    "Parfitt", "Parikh", "Park", "Parker", "Parkin", "Parkinson", "Parnell", "Parr", "Parry", "Parshad",
    "Parsons", "Parthiv", "Partridge", "Patel", "Pathan", "Pathirana", "Patterson", "Pattinson", "Patton", "Paul",
    "Pavilion", "Payne", "Peace", "Peacock", "Peake", "Pearce", "Pearson", "Peart", "Peate", "Peck",
    "Pedley", "Peebles", "Peel", "Peirson", "Pelham", "Pemberton", "Pendleton", "Peng", "Penn", "Pennell",
    "Pennington", "Penny", "Penrhyn", "Pepper", "Perera", "Perkins", "Permaul", "Perry", "Peters", "Petersen",
    "Peterson", "Pethe", "Pettiford", "Pettini", "Peyton", "Phelps", "Phehlukwayo", "Philander", "Philip", "Philipps",
    "Philips", "Phillip", "Phillipps", "Phillips", "Phillpotts", "Philpott", "Phipps", "Pickering", "Pickles", "Pickup",
    "Piddington", "Piedt", "Pierce", "Pierson", "Pietersen", "Pike", "Pilch", "Pilkington", "Pillai", "Pinder",
    "Pink", "Pinnington", "Pinnock", "Piotrowski", "Piper", "Pirie", "Pite", "Pitcher", "Pitman", "Pitt",
    "Pitts", "Plant", "Platt", "Platts", "Player", "Pledge", "Plomer", "Plumb", "Plummer", "Plunkett",
    "Pocklington", "Pocock", "Pogson", "Polglase", "Pollard", "Polley", "Pollock", "Ponsonby", "Poole", "Pooley",
    "Poore", "Poots", "Pope", "Port", "Portal", "Porter", "Porterfield", "Pothas", "Pott", "Potter",
    "Potts", "Poulter", "Poulton", "Powell", "Power", "Powys", "Poynter", "Prasad", "Pratt", "Preece",
    "Prendergast", "Prentice", "Prescott", "Preston", "Pretorius", "Price", "Prichard", "Prideaux", "Pridmore", "Priest",
    "Priestley", "Prime", "Prince", "Pringle", "Prior", "Pritchard", "Pritt", "Probert", "Procter", "Proctor",
    "Proud", "Prout", "Provis", "Prowse", "Pryce", "Pryke", "Pryor", "Puddephatt", "Pudner", "Pugh",
    "Pugsley", "Pujara", "Pulford", "Pullen", "Pullin", "Pulman", "Purcell", "Purchase", "Purdy", "Purkiss",
    "Pursehouse", "Purves", "Purvis", "Pyatt", "Pye", "Pyke", "Pyman", "Pyne", "Pyrah", "Qadir",
    "Qais", "Qasim", "Qazi", "Qeshile", "Quick", "Quigley", "Quill", "Quin", "Quinlan", "Quinn",
    "Quinney", "Quinton", "Quirke", "Rabada", "Rackham", "Radcliffe", "Radford", "Rae", "Rafiq", "Ragg",
    "Rahane", "Rahman", "Rai", "Raina", "Raine", "Rainey", "Raisbeck", "Raistrick", "Raj", "Raja",
    "Rajapaksa", "Rajitha", "Raju", "Ralph", "Ram", "Ramadhin", "Ramage", "Raman", "Ramchand", "Ramdin",
    "Rampling", "Ramsay", "Ramsbotham", "Ramsbottom", "Ramsden", "Ramsey", "Rana", "Rance", "Randall", "Randell",
    "Randeria", "Randhawa", "Randle", "Ranger", "Ranji", "Rankin", "Ransford", "Rao", "Raper", "Rashid",
    "Rathbone", "Ratnam", "Rattray", "Rauf", "Ravenscroft", "Rawat", "Rawbone", "Rawlings", "Rawlins", "Rawlinson",
    "Rawson", "Ray", "Raybould", "Rayment", "Raymer", "Raymond", "Rayner", "Raynor", "Raza", "Razzaq",
    "Rea", "Read", "Reade", "Reader", "Reading", "Ready", "Reason", "Reddish", "Redfearn", "Redfern",
    "Redford", "Redgrave", "Redhead", "Redman", "Redmayne", "Redmond", "Redpath", "Reed", "Reeder", "Rees",
    "Reeve", "Reeves", "Reid", "Reilly", "Relf", "Renshaw", "Renton", "Revell", "Reynolds", "Rhodes",
    "Richards", "Richardson", "Richmond", "Ricketts", "Rickman", "Riddell", "Rider", "Ridgway", "Ridley", "Rigby",
    "Riley", "Rimell", "Ring", "Ringer", "Ritchie", "Ritson", "Rivers", "Rivett", "Rix", "Rixon",
    "Roach", "Robb", "Robbins", "Roberts", "Robertson", "Robins", "Robinson", "Robson", "Roche", "Rochford",
    "Rock", "Roddick", "Roderick", "Rodger", "Rodgers", "Roe", "Rofe", "Roffey", "Rogers", "Rogerson",
    "Rolfe", "Rolleston", "Rollo", "Romer", "Ronaldson", "Roney", "Rooke", "Roope", "Root", "Roper",
    "Rose", "Rosen", "Rosenthal", "Roseveare", "Rosin", "Ross", "Rosse", "Rosser", "Rotherham", "Rothery",
    "Round", "Rouse", "Routledge", "Rowan", "Rowbotham", "Rowbottom", "Rowe", "Rowell", "Rowland", "Rowlands",
    "Rowlatt", "Rowley", "Rowntree", "Rowsell", "Roy", "Royle", "Rudd", "Rudder", "Ruddle", "Ruddock",
    "Rudge", "Rudolph", "Ruggles", "Rumbold", "Rummery", "Rundell", "Rundle", "Rush", "Rushby", "Rushton",
    "Rushworth", "Russ", "Russell", "Rust", "Rutherford", "Ruthven", "Rutland", "Rutter", "Ryall", "Rycroft",
    "Ryder", "Rydon", "Ryland", "Rylands", "Ryle", "Ryley", "Rymer", "Rymill", "Sabharwal", "Sadler",
    "Sage", "Sagar", "Sainsbury", "Sale", "Salisbury", "Salmon", "Salter", "Sampson", "Sams", "Samson",
    "Samuel", "Samuels", "Sanders", "Sanderson", "Sandford", "Sandham", "Sandiford", "Sands", "Sangakkara", "Santner",
    "Sarfaraz", "Sargeant", "Sargent", "Sarker", "Sarwan", "Satterthwaite", "Saul", "Saunders", "Savage", "Savill",
    "Sawyer", "Saxon", "Saxton", "Sayer", "Sayers", "Scales", "Scammell", "Scarborough", "Scarlett", "Scarr",
    "Schofield", "Scholes", "Scholtz", "Schrader", "Schreuder", "Scott", "Scovell", "Scrimshaw", "Scrivener", "Scruby",
    "Scudamore", "Scully", "Scurr", "Seabrook", "Seager", "Seal", "Seale", "Sealey", "Seals", "Sealy",
    "Seaman", "Searle", "Sears", "Searson", "Seaton", "Seddon", "Sedgwick", "Seed", "Sefton", "Selby",
    "Self", "Sellars", "Seller", "Sellers", "Selman", "Selway", "Semple", "Senior", "Sephton", "Sergeant",
    "Service", "Seth", "Sethi", "Seward", "Sewell", "Seymour", "Shadab", "Shafiq", "Shah", "Shahidi",
    "Shaikh", "Shamsi", "Shand", "Shanks", "Shannon", "Shapoorji", "Sharland", "Sharma", "Sharman", "Sharp",
    "Sharpe", "Sharples", "Shattock", "Shaw", "Shaxson", "Shea", "Shearing", "Shearman", "Sheehan", "Sheen",
    "Sheldon", "Shelford", "Shelley", "Shelton", "Shenton", "Shephard", "Shepherd", "Shepley", "Shepperson", "Sheridan",
    "Sheriff", "Sherman", "Sherriff", "Sherwin", "Sherwood", "Shiel", "Shields", "Shiels", "Shilling", "Shillingford",
    "Shillito", "Shilton", "Shinwari", "Shipley", "Shipman", "Shipton", "Shirley", "Shirt", "Shoaib", "Shore",
    "Short", "Shorthouse", "Shortland", "Shotton", "Shoulder", "Shreeve", "Shrewsbury", "Shrimpton", "Shroff", "Shukla",
    "Shute", "Shuttleworth", "Sibley", "Sidebottom", "Sidgwick", "Sidney", "Silcock", "Silk", "Sillence", "Silver",
    "Silverwood", "Silvester", "Sim", "Simcox", "Sime", "Simes", "Simkins", "Simmonds", "Simmons", "Simon",
    "Simons", "Simper", "Simpkin", "Simpkins", "Simpson", "Sims", "Sinclair", "Sing", "Singer", "Singh",
    "Singleton", "Sinha", "Sinker", "Sinnott", "Siret", "Sirianni", "Sissons", "Skeaping", "Skeate", "Skeats",
    "Skelding", "Skellorn", "Skelton", "Skene", "Sketchley", "Skerrett", "Skerritt", "Skewes", "Skidmore", "Skilbeck",
    "Skinner", "Skipper", "Skipwith", "Skirrow", "Skitt", "Skrine", "Sladden", "Slade", "Slaney", "Slark",
    "Slater", "Slatter", "Slattery", "Slaughter", "Sleath", "Sleeman", "Sleep", "Sleigh", "Sleight", "Slessor",
    "Slevin", "Slight", "Slinger", "Sloane", "Slocombe", "Sloman", "Smailes", "Smale", "Smales", "Small",
    "Smalley", "Smallwood", "Smart", "Smeaton", "Smedley", "Smee", "Smellie", "Smethurst", "Smiles", "Smillie",
    "Smith", "Smoker", "Smout", "Smyth", "Smythe", "Snape", "Snashall", "Snell", "Snook", "Snow",
    "Snowball", "Snowden", "Snowdon", "Soames", "Soar", "Soden", "Sodhi", "Sole", "Solomon", "Somers",
    "Somerset", "Somerville", "Sommer", "Songer", "Soper", "Sorrell", "Sotheby", "Sotnick", "Soutar", "Souter",
    "South", "Southall", "Southam", "Southcott", "Southerton", "Southey", "Southgate", "Southon", "Southwell", "Southwood",
    "Soutter", "Southee", "Spackman", "Spalding", "Spark", "Sparke", "Sparkes", "Sparks", "Sparling", "Sparrow",
    "Spaul", "Speake", "Spear", "Spearing", "Spearman", "Spears", "Speed", "Speer", "Speight", "Spence",
    "Spencer", "Spens", "Spensley", "Sperring", "Spice", "Spicer", "Spiers", "Spikins", "Spillane", "Spiller",
    "Spilsbury", "Spink", "Spinks", "Spooner", "Spottiswoode", "Spragg", "Sprague", "Spratt", "Spreadbury", "Spree",
    "Spring", "Springer", "Springett", "Sproat", "Sproston", "Sproule", "Spry", "Spurdle", "Spurling", "Spurr",
    "Spurrier", "Spurway", "Squarey", "Squire", "Squires", "Stacey", "Stafford", "Stagg", "Stainforth", "Stainsby",
    "Stainton", "Stallard", "Stallwood", "Stammers", "Stamp", "Stamper", "Stanbrough", "Stanbury", "Standen", "Standing",
    "Standish", "Standley", "Stanford", "Stanhope", "Stanier", "Staniland", "Stanley", "Stanmore", "Stannard", "Stansfield",
    "Stanton", "Stanway", "Stanyforth", "Staple", "Staples", "Stapleton", "Stapley", "Starbuck", "Starcevich", "Stare",
    "Starf", "Stark", "Starke", "Starkey", "Starkie", "Starling", "Starr", "Statham", "Staton", "Staughton",
    "Staveley", "Stayner", "Stead", "Steadman", "Steane", "Stear", "Stearn", "Stearns", "Stebbings", "Stebbing",
    "Stebbins", "Steed", "Steedman", "Steel", "Steele", "Steer", "Steere", "Steet", "Steggall", "Stein",
    "Stell", "Stembridge", "Stenhouse", "Stenner", "Stenning", "Stenson", "Stephen", "Stephens", "Stephenson", "Stepney",
    "Sterland", "Sterling", "Sterndale", "Stern", "Sterne", "Sterry", "Steven", "Stevens", "Stevenson", "Steward",
    "Stewart", "Steyn", "Stibbs", "Stickland", "Stickley", "Stiff", "Stiles", "Still", "Stillwell", "Stimpson",
    "Stinson", "Stirk", "Stirland", "Stirling", "Stirrup", "Stitt", "Stiven", "Stobart", "Stobbs", "Stobo",
    "Stock", "Stockdale", "Stocker", "Stockham", "Stockill", "Stockley", "Stockman", "Stocks", "Stockton", "Stockwell",
    "Stoddart", "Stokes", "Stokoe", "Stollery", "Stone", "Stonebridge", "Stoneham", "Stonehouse", "Stoner", "Stones",
    "Stonestreet", "Stoney", "Stonham", "Stonor", "Stoop", "Stopford", "Stopps", "Storer", "Storey", "Storr",
    "Storrier", "Storrs", "Storry", "Story", "Stothard", "Stothert", "Stott", "Stoughton", "Stout", "Stovell",
    "Stovin", "Stow", "Stowe", "Stowell", "Stower", "Stowers", "Strachan", "Strachey", "Stradling", "Strafford",
    "Straight", "Strain", "Straith", "Straker", "Strang", "Strange", "Strangeman", "Strangeways", "Stranks", "Stratfield",
    "Stratford", "Strathern", "Strathmore", "Stratton", "Strauss", "Streatfeild", "Streatfield", "Street", "Streeter", "Strelley",
    "Stretton", "Strickland", "Stride", "Stringer", "Strong", "Stroud", "Strudwick", "Struthers", "Strutt", "Stuart",
    "Stubbing", "Stubbington", "Stubbs", "Stubington", "Stuckey", "Studds", "Studdy", "Studd", "Sturgeon", "Sturgess",
    "Sturman", "Sturridge", "Sturrock", "Sturt", "Stutchbury", "Stuttard", "Styles", "Subrayen", "Sudharsan", "Sullivan",
    "Sultan", "Sundar", "Sutcliffe", "Sutton", "Swain", "Swan", "Swann", "Swanton", "Sweet", "Swift",
    "Swinhoe", "Swinstead", "Swire", "Sydenham", "Sykes", "Symes", "Symonds", "Symons", "Syrett", "Taggart",
    "Tahir", "Tait", "Talbot", "Talpur", "Tandy", "Tangri", "Tanner", "Tanvir", "Tariq", "Tarrant",
    "Tate", "Tatham", "Tattersall", "Taylor", "Teague", "Tebbutt", "Tector", "Teixeira", "Temperley", "Temple",
    "Tendulkar", "Tennant", "Terry", "Tewatia", "Thacker", "Thackeray", "Thakur", "Theobald", "Thewlis", "Thind",
    "Thomas", "Thompson", "Thomson", "Thorne", "Thornton", "Thorogood", "Thorpe", "Thurgood", "Thwaites", "Tibbetts",
    "Tickner", "Tiffin", "Tilbury", "Tillakaratne", "Tilleard", "Tilley", "Tindall", "Tinker", "Tinsley", "Tipper",
    "Tipping", "Tirrell", "Tisch", "Titcomb", "Titmus", "Tizzard", "Tobin", "Todd", "Tolcher", "Toll",
    "Tollemache", "Tolley", "Tomkin", "Tomkins", "Tomkinson", "Tomlin", "Tomlinson", "Tompkins", "Toms", "Tonbridge",
    "Tonge", "Tonkin", "Tonks", "Toogood", "Tooke", "Tookey", "Toole", "Tooley", "Toombs", "Toone",
    "Toote", "Tooth", "Toothill", "Toovey", "Topham", "Topley", "Topping", "Torr", "Torrance", "Torrens",
    "Torrington", "Tothill", "Tott", "Tottenham", "Touzel", "Tovey", "Tower", "Towers", "Towgood", "Towle",
    "Towne", "Townend", "Townley", "Townrow", "Townsend", "Townshend", "Towse", "Toy", "Toyne", "Toynbee",
    "Tracey", "Tracy", "Trafford", "Traill", "Tranter", "Travers", "Travis", "Treadwell", "Treble", "Tredwell",
    "Tree", "Tregear", "Tregellas", "Trego", "Treharne", "Treloar", "Treliving", "Trembath", "Tremlett", "Trench",
    "Trenchard", "Trent", "Treseder", "Trescothick", "Trethewey", "Trevelyan", "Trevett", "Trevor", "Trew", "Trewavas",
    "Trewella", "Trewhella", "Trewin", "Tribe", "Trice", "Trick", "Trickey", "Trigger", "Triggs", "Trim",
    "Trimmer", "Trinder", "Tripp", "Trippett", "Trist", "Tristram", "Tritton", "Troll", "Trollope", "Trott",
    "Trotter", "Troughton", "Trounce", "Trout", "Trower", "Trueman", "Truman", "Trump", "Trumper", "Truscott",
    "Trust", "Trustram", "Tryon", "Tubbs", "Tuck", "Tucker", "Tuckett", "Tuckey", "Tudge", "Tudhope",
    "Tudor", "Tuff", "Tuffey", "Tuffnell", "Tufton", "Tugwell", "Tulk", "Tull", "Tulley", "Tulloch",
    "Tully", "Tunbridge", "Tunnard", "Tunnicliffe", "Tunstall", "Tupper", "Turberville", "Turbutt", "Turley", "Turnbull",
    "Turner", "Turney", "Turnor", "Turpin", "Turrell", "Turton", "Tuson", "Tutcher", "Tutt", "Tweddell",
    "Tweed", "Tweedale", "Tweedie", "Tweedy", "Twentyman", "Twigg", "Twining", "Twisden", "Twiss", "Twist",
    "Twizell", "Twopeny", "Twose", "Twyman", "Tyers", "Tylecote", "Tyler", "Tyndall", "Tyrer", "Tyrrell",
    "Tyrwhitt", "Tyson", "Ud-Din", "Udall", "Uden", "Uglow", "Ul-Haq", "Umran", "Underdown", "Underhill",
    "Underwood", "Unthank", "Unwin", "Upcott", "Upfold", "Upham", "Uphill", "Uppadine", "Upsall", "Upshall",
    "Upson", "Upstone", "Upton", "Upward", "Urquhart", "Usborne", "Usher", "Usherwood", "Ussher", "Utley",
    "Uttley", "Vachell", "Vaizey", "Vale", "Valentine", "Valiant", "Vallance", "Valletort", "Vallings", "Vanstone",
    "Varcoe", "Varley", "Varnam", "Varndell", "Varney", "Varty", "Vasey", "Vass", "Vassall", "Vatcher",
    "Vaudrey", "Vaughan", "Vause", "Vautier", "Vaux", "Veal", "Veale", "Veasey", "Veazey", "Vellacott",
    "Venables", "Venn", "Venner", "Venning", "Verco", "Verdon", "Verity", "Verner", "Verney", "Vernon",
    "Verrall", "Verrier", "Vesey", "Veysey", "Vezey", "Vialls", "Vian", "Vicary", "Viccars", "Vickers",
    "Vickery", "Victor", "Vidal", "Vidler", "Vigor", "Vigurs", "Viles", "Villiers", "Vince", "Vincent",
    "Vine", "Viner", "Vines", "Viney", "Vining", "Vinson", "Vinter", "Vipond", "Virtue", "Viveash",
    "Vizard", "Vobes", "Vogan", "Vogler", "Voigt", "Voisey", "Vokes", "Von Bibra", "Voss", "Voyce",
    "Vyner", "Vynne", "Vyse", "Vyvyan", "Wace", "Wackett", "Waddell", "Waddingham", "Waddington", "Waddle",
    "Waddy", "Wade", "Wadham", "Wadley", "Wadman", "Wadsworth", "Wagener", "Wager", "Wagg", "Waghorn",
    "Wagner", "Wagstaff", "Wagstaffe", "Wain", "Waine", "Wainwright", "Waistell", "Waite", "Waites", "Wake",
    "Wakefield", "Wakeford", "Wakeham", "Wakelin", "Wakeling", "Wakeman", "Wakley", "Walch", "Walcot", "Walcott",
    "Waldock", "Waldram", "Waldron", "Waldrum", "Wale", "Wales", "Waley", "Walford", "Walkden", "Walker",
    "Walkey", "Walkinshaw", "Wall", "Wallace", "Waller", "Walley", "Wallis", "Wallwork", "Walmsley", "Walrond",
    "Walsh", "Walsham", "Walter", "Walters", "Waltham", "Walthew", "Walton", "Walwyn", "Wanklyn", "Wannop",
    "Warburton", "Ward", "Warde", "Wardell", "Warden", "Wardle", "Wardley", "Wardman", "Wardner", "Ware",
    "Wareham", "Wareing", "Waring", "Warland", "Warmington", "Warne", "Warner", "Warr", "Warre", "Warren",
    "Warrender", "Warrick", "Warrington", "Warsop", "Wartnaby", "Warton", "Warwick", "Wase", "Washbourn", "Washington",
    "Wason", "Wass", "Wassell", "Waterfield", "Waterhouse", "Waterlow", "Waterman", "Waters", "Waterson", "Wathen",
    "Watkin", "Watkins", "Watkinson", "Watling", "Watney", "Watson", "Watt", "Watters", "Watterson", "Watts",
    "Waugh", "Wawn", "Way", "Waylen", "Wayman", "Wayne", "Weakley", "Wearing", "Weatherall", "Weatherby",
    "Weatherhead", "Weatherley", "Weaver", "Webb", "Webbe", "Webber", "Webbley", "Webley", "Webster", "Wedderburn",
    "Wedge", "Wedgwood", "Weeding", "Weedon", "Weekes", "Weeks", "Weigall", "Weight", "Weightman", "Weir",
    "Welby", "Welch", "Welchman", "Weld", "Weldon", "Welford", "Welland", "Weller", "Wellesley", "Wellfair",
    "Wellings", "Wellington", "Wells", "Wellsted", "Welman", "Welsby", "Welsford", "Welsh", "Wenham", "Wenlock",
    "Wenman", "Wentworth", "Were", "Werge", "Wernham", "Wesley", "West", "Westall", "Westbrook", "Westbury",
    "Westcomb", "Westcombe", "Westcott", "Westell", "Western", "Westfield", "Westgarth", "Westhead", "Westhorp", "Westlake",
    "Westley", "Westmacott", "Westman", "Westoby", "Weston", "Westray", "Westropp", "Westrup", "Westwood", "Wetherall",
    "Wetherby", "Wethered", "Wetherell", "Wetherfield", "Wetton", "Whale", "Whalley", "Wharmby", "Wharton", "Wheat",
    "Wheatcroft", "Wheatley", "Wheeler", "Wheelhouse", "Wheelton", "Wheelwright", "Whelan", "Wheldon", "Wheler", "Whelpdale",
    "Wheller", "Whellock", "Whetham", "Whichcote", "Whichelo", "Whicker", "Whiddon", "Whiley", "Whimper", "Whincup",
    "Whineray", "Whing", "Whinney", "Whinyates", "Whipham", "Whipple", "Whish", "Whishaw", "Whisker", "Whistler",
    "Whiston", "Whitaker", "Whitbread", "Whitby", "Whitchurch", "Whitcombe", "White", "Whitear", "Whitefield", "Whiteford",
    "Whitehead", "Whitehorn", "Whitehouse", "Whitelaw", "Whiteley", "Whitelock", "Whitelocke", "Whiteman", "Whiteway", "Whitfield",
    "Whitford", "Whitham", "Whiting", "Whitley", "Whitlock", "Whitlow", "Whitman", "Whitmarsh", "Whitmee", "Whitmore",
    "Whitnell", "Whitney", "Whitsed", "Whitson", "Whittaker", "Whittall", "Whittam", "Whitter", "Whitting", "Whittingham",
    "Whittington", "Whittle", "Whittles", "Whittlesea", "Whittome", "Whitton", "Whitty", "Whitwell", "Whitworth", "Whyatt",
    "Whybrow", "Whyley", "Whyman", "Whymper", "Whyte", "Whytehead", "Wickenden", "Wickens", "Wickham", "Wicking",
    "Wickings", "Wicks", "Wicksteed", "Widdicombe", "Widdowson", "Widdrington", "Wieland", "Wigan", "Wigg", "Wiggett",
    "Wiggins", "Wigginton", "Wigglesworth", "Wight", "Wightman", "Wightwick", "Wigley", "Wigmore", "Wigram", "Wilbraham",
    "Wilby", "Wilcock", "Wilcocks", "Wilcox", "Wild", "Wilde", "Wilder", "Wildgoose", "Wilding", "Wildman",
    "Wilds", "Wiles", "Wilford", "Wilkes", "Wilkie", "Wilkin", "Wilkins", "Wilkinson", "Wilks", "Willan",
    "Willans", "Willats", "Willcock", "Willcocks", "Willcox", "Willett", "Willetts", "Willi", "Williams", "Williamson",
    "Willink", "Willis", "Willmer", "Willmott", "Willock", "Willoughby", "Wills", "Willsher", "Willshire", "Willson",
    "Willstrop", "Wilmer", "Wilmot", "Wilmott", "Wilmshurst", "Wilshaw", "Wilson", "Wilton", "Wimbush", "Wimpenny",
    "Winch", "Winchester", "Winckworth", "Windass", "Winder", "Windle", "Window", "Windross", "Windsor", "Winfield",
    "Wing", "Wingate", "Wingfield", "Winkfield", "Winkley", "Winks", "Winkworth", "Winmill", "Winn", "Winnall",
    "Winning", "Winnington", "Winser", "Winskill", "Winslow", "Winsor", "Winstanley", "Winship", "Winspear", "Winstone",
    "Winter", "Winterbotham", "Winterbottom", "Winterburn", "Winteringham", "Winters", "Wintersgill", "Winterton", "Winthrop", "Wintle",
    "Winton", "Wintour", "Winwood", "Wire", "Wirksworth", "Wisden", "Wisdom", "Wise", "Wiseman", "Wishart",
    "Witcher", "Witham", "Wither", "Witherby", "Witherington", "Withers", "Withey", "Witt", "Witton", "Witty",
    "Wix", "Wodehouse", "Wolfe", "Wolfenden", "Wolff", "Wollaston", "Wolrich", "Wolseley", "Wolstenholme", "Wombwell",
    "Womersley", "Wonfor", "Wood", "Woodall", "Woodard", "Woodbridge", "Woodbury", "Woodcock", "Woodfall", "Woodfield",
    "Woodford", "Woodforde", "Woodgate", "Woodger", "Woodhams", "Woodhead", "Woodhouse", "Woodhull", "Woodin", "Wooding",
    "Woodiwiss", "Woodland", "Woodley", "Woodman", "Woodroffe", "Woodroofe", "Woodrow", "Woodruff", "Woodruffe", "Woods",
    "Woodsend", "Woodson", "Woodstock", "Woodthorpe", "Woodward", "Woodyatt", "Woof", "Woolcott", "Wooler", "Woolf",
    "Woolfall", "Woolford", "Woolgar", "Woolhouse", "Woollam", "Woollatt", "Woollcombe", "Woollen", "Woolley", "Woolmer",
    "Woolner", "Woolrich", "Woolrych", "Woolston", "Woosnam", "Wooster", "Wootton", "Worboys", "Worcester", "Wordsworth",
    "Workman", "Worlidge", "Wormald", "Wormell", "Wormleighton", "Worrall", "Worsfold", "Worsley", "Worsnop", "Worth",
    "Worthington", "Wortley", "Wotherspoon", "Wotton", "Wragg", "Wray", "Wren", "Wrench", "Wride", "Wright",
    "Wrighton", "Wrightson", "Wrigley", "Wrixon", "Wrottesley", "Wroughton", "Wyatt", "Wybergh", "Wycherley", "Wyke",
    "Wykeham", "Wyld", "Wylde", "Wyles", "Wylie", "Wyllie", "Wyman", "Wyndham", "Wynn", "Wynne",
    "Wynter", "Wyon", "Yallop", "Yarborough", "Yard", "Yarde", "Yardley", "Yarlett", "Yarnold", "Yarrow",
    "Yate", "Yates", "Yeames", "Yeandle", "Yeates", "Yeatman", "Yeats", "Yeatsman", "Yeld", "Yell",
    "Yelland", "Yelverton", "Yeo", "Yeoman", "Yeomans", "Yerburgh", "Yonge", "York", "Yorke", "Youatt",
    "Youell", "Youens", "Youl", "Youle", "Youll", "Young", "Younger", "Younghusband", "Youngman", "Youngs",
    "Yoxall", "Yule", "Zadran", "Zahid", "Zaman", "Zampa", "Zia", "Zoysa"
]

def calculate_dynamic_rarity_score(role, matches, runs, wickets, strike_rate, economy):
    m = max(1, matches)
    rpm = runs / m
    wpm = wickets / m

    if role == "Batsman":
        avg_score = min(rpm / 45.0, 1.25) * 45.0
        sr_score = min(strike_rate / 150.0, 1.25) * 35.0
        career_score = min(runs / 3500.0, 1.0) * 20.0
        dpi = avg_score + sr_score + career_score
    elif role == "Bowler":
        strike_score = min(wpm / 1.3, 1.25) * 45.0
        econ_score = max(0.0, min((9.5 - economy) / 3.5, 1.25)) * 35.0 if economy > 0 else 20.0
        career_score = min(wickets / 80.0, 1.0) * 20.0
        dpi = strike_score + econ_score + career_score
    elif role == "All-Rounder":
        bat_score = (min(rpm / 28.0, 1.2) * 25.0) + (min(strike_rate / 140.0, 1.2) * 15.0)
        bowl_score = (min(wpm / 0.9, 1.2) * 25.0) + (max(0.0, (9.0 - economy) / 3.0) * 15.0 if economy > 0 else 10.0)
        career_score = min((runs + wickets * 25) / 2500.0, 1.0) * 20.0
        dpi = bat_score + bowl_score + career_score
    else:  # Wicketkeeper
        avg_score = min(rpm / 40.0, 1.2) * 50.0
        sr_score = min(strike_rate / 140.0, 1.2) * 30.0
        career_score = min(runs / 3000.0, 1.0) * 20.0
        dpi = avg_score + sr_score + career_score

    dpi = round(dpi, 1)

    if dpi >= 85.0:
        return "Legendary", 2.0, dpi
    elif dpi >= 70.0:
        return "Epic", 1.5, dpi
    elif dpi >= 55.0:
        return "Rare", 1.25, dpi
    elif dpi >= 40.0:
        return "Uncommon", 1.1, dpi
    else:
        return "Common", 1.0, dpi

def generate_player_database(target_count=4500):
    random.seed(2026)
    players = []
    seen_names = set()
    current_id = 1

    # First, inject all hand-curated real international legends and modern stars
    for nation, categories in NATIONS_DATA.items():
        franchises = categories["franchises"]
        
        for pool_key, role in [
            ("legends_batsmen", "Batsman"),
            ("modern_batsmen", "Batsman"),
            ("legends_bowlers", "Bowler"),
            ("modern_bowlers", "Bowler"),
            ("all_rounders", "All-Rounder"),
            ("wicketkeepers", "Wicketkeeper"),
        ]:
            names = categories.get(pool_key, [])
            for name in names:
                if name in seen_names:
                    continue
                seen_names.add(name)

                # Realistic distribution for known stars
                is_legend_tier = "legends" in pool_key or name in ["Virat Kohli", "Jasprit Bumrah", "Rohit Sharma", "Steve Smith", "Joe Root", "Kane Williamson", "Babar Azam", "Pat Cummins", "Rashid Khan", "Ben Stokes", "Mitchell Starc", "Glenn Maxwell", "David Warner", "Kagiso Rabada", "Quinton de Kock", "Shakib Al Hasan", "Shaheen Shah Afridi"]
                matches = random.randint(80, 220) if is_legend_tier else random.randint(35, 110)
                debut_year = random.randint(2000, 2012) if "legends" in pool_key else random.randint(2013, 2024)

                if role == "Batsman":
                    runs = int(matches * (random.uniform(32.0, 48.0) if is_legend_tier else random.uniform(22.0, 36.0)))
                    wickets = random.randint(0, 5)
                    sr = round(random.uniform(128.0, 155.0), 1)
                    econ = 0.0
                elif role == "Bowler":
                    runs = int(matches * random.uniform(2.0, 8.0))
                    wickets = int(matches * (random.uniform(1.15, 1.55) if is_legend_tier else random.uniform(0.85, 1.25)))
                    sr = round(random.uniform(85.0, 120.0), 1)
                    econ = round(random.uniform(6.1, 7.6) if is_legend_tier else random.uniform(7.1, 8.9), 2)
                elif role == "All-Rounder":
                    runs = int(matches * random.uniform(18.0, 32.0))
                    wickets = int(matches * random.uniform(0.75, 1.2))
                    sr = round(random.uniform(130.0, 160.0), 1)
                    econ = round(random.uniform(6.8, 8.4), 2)
                else:  # Wicketkeeper
                    runs = int(matches * (random.uniform(28.0, 42.0) if is_legend_tier else random.uniform(20.0, 32.0)))
                    wickets = 0
                    sr = round(random.uniform(125.0, 148.0), 1)
                    econ = 0.0

                rarity, mult, dpi = calculate_dynamic_rarity_score(role, matches, runs, wickets, sr, econ)
                credit_cost = round(min(11.0, max(7.0, 6.5 + (dpi / 22.0))), 1)
                price_cric = int(350 + (dpi * 18))

                team = random.choice(franchises)

                avatar_fname = name.lower().replace(" ", "_").replace("'", "").replace(".", "") + ".jpg"
                avatar_path = f"/images/players/{avatar_fname}" if os.path.exists(f"public/images/players/{avatar_fname}") else f"/images/players/avatar_placeholder.png"

                players.append({
                    "id": current_id,
                    "name": name,
                    "country": nation.split(" & ")[0],
                    "team": team,
                    "role": role,
                    "debutYear": debut_year,
                    "matches": matches,
                    "runs": runs,
                    "wickets": wickets,
                    "strikeRate": sr,
                    "economy": econ,
                    "rarity": rarity,
                    "dpi": dpi,
                    "multiplier": mult,
                    "creditCost": credit_cost,
                    "priceCRIC": price_cric,
                    "avatar": avatar_path,
                })
                current_id += 1

    print(f"Loaded {len(players)} curated top-tier cricketers.")

    # Now systematically synthesize and expand authentic domestic and league cricketers (2000-2026)
    # Covering full spectrum of Common, Uncommon, Rare, Epic
    all_franchises_flat = [f for cat in NATIONS_DATA.values() for f in cat["franchises"]]
    roles_pool = ["Batsman", "Bowler", "All-Rounder", "Wicketkeeper"]
    roles_weights = [0.42, 0.38, 0.12, 0.08]

    first_names_count = len(FIRST_NAMES_GLOBAL)
    surnames_count = len(SURNAMES_GLOBAL)

    fn_idx = 0
    sn_idx = 0

    while len(players) < target_count:
        first = FIRST_NAMES_GLOBAL[fn_idx % first_names_count]
        last = SURNAMES_GLOBAL[sn_idx % surnames_count]
        fn_idx = (fn_idx + 7) % first_names_count
        sn_idx = (sn_idx + 13) % surnames_count

        full_name = f"{first} {last}"
        if full_name in seen_names:
            full_name = f"{first} {last} Jr"
            if full_name in seen_names:
                continue
        seen_names.add(full_name)

        role = random.choices(roles_pool, weights=roles_weights)[0]
        debut_year = random.randint(2000, 2025)
        career_span = max(1, 2026 - debut_year)
        matches = random.randint(8, min(140, career_span * 14 + 5))

        # Skill profile distribution (bell curve with domestic/rising players)
        skill_factor = random.betavariate(2.2, 3.2) # Skews towards solid domestic/uncommon/rare

        if role == "Batsman":
            avg = 14.0 + (skill_factor * 32.0)
            runs = int(matches * avg)
            wickets = random.randint(0, 3) if random.random() < 0.25 else 0
            sr = round(105.0 + (skill_factor * 48.0), 1)
            econ = 0.0
        elif role == "Bowler":
            runs = int(matches * random.uniform(2.0, 7.5))
            wpm = 0.55 + (skill_factor * 0.95)
            wickets = int(matches * wpm)
            sr = round(80.0 + random.uniform(0, 40), 1)
            econ = round(9.8 - (skill_factor * 3.4), 2)
        elif role == "All-Rounder":
            avg = 12.0 + (skill_factor * 20.0)
            runs = int(matches * avg)
            wpm = 0.45 + (skill_factor * 0.7)
            wickets = int(matches * wpm)
            sr = round(115.0 + (skill_factor * 42.0), 1)
            econ = round(9.4 - (skill_factor * 2.6), 2)
        else: # Wicketkeeper
            avg = 15.0 + (skill_factor * 26.0)
            runs = int(matches * avg)
            wickets = 0
            sr = round(110.0 + (skill_factor * 38.0), 1)
            econ = 0.0

        rarity, mult, dpi = calculate_dynamic_rarity_score(role, matches, runs, wickets, sr, econ)
        credit_cost = round(min(10.5, max(7.0, 6.2 + (dpi / 24.0))), 1)
        price_cric = int(220 + (dpi * 16))
        team = random.choice(all_franchises_flat)

        players.append({
            "id": current_id,
            "name": full_name,
            "country": "International / Franchise League",
            "team": team,
            "role": role,
            "debutYear": debut_year,
            "matches": matches,
            "runs": runs,
            "wickets": wickets,
            "strikeRate": sr,
            "economy": econ,
            "rarity": rarity,
            "dpi": dpi,
            "multiplier": mult,
            "creditCost": credit_cost,
            "priceCRIC": price_cric,
            "avatar": "/images/players/avatar_placeholder.png",
        })
        current_id += 1

    os.makedirs("server/data", exist_ok=True)
    out_file = "server/data/players_2000_2026.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(players, f, indent=2)

    # Calculate rarity tier stats
    rarities = {}
    for p in players:
        r = p["rarity"]
        rarities[r] = rarities.get(r, 0) + 1

    print(f"\n==================================================")
    print(f"🎉 Generated {len(players)} Cricketers (2000–2026 Era)!")
    print(f"File Saved: {out_file} ({os.path.getsize(out_file) / 1024 / 1024:.2f} MB)")
    print(f"Rarity Distribution:")
    for tier, cnt in rarities.items():
        print(f"  • {tier}: {cnt} players ({cnt/len(players)*100:.1f}%)")
    print(f"==================================================")

if __name__ == "__main__":
    generate_player_database(4800)
