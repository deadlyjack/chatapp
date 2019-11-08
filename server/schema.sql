create table users(
    phone varchar(13) not null primary key,
    name varchar(50) not null,
    avatar text,
    password text not null
);

create table logins(
    id int auto_increment primary key,
    user varchar(13) not null,
    token text not null,
    expire varchar(15),
    foreign key (user) references users(phone) on delete cascade on update cascade
);