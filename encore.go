package main

import (
	"encore.dev"
	"encore.dev/storage/sqldb"
)

var db = sqldb.NewDatabase("users", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

var _ = encore.Service("user-api", encore.ServiceConfig{
	Databases: []*sqldb.Database{db},
})
