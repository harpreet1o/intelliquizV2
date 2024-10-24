import 'dotenv/config';
import sql from 'mssql';


const dbConfig = {
    user: process.env.databaseUser,
    password: process.env.databasePassword,
    server: process.env.databaseServer,
    database: process.env.databaseName,
    options: {
      encrypt: true,
      trustServerCertificate: process.env.databaseTrustServerCertificate === 'false',
    },
    connectionTimeout: parseInt(process.env.databaseConnectionTimeout, 10)
  };
let connection;

// Connect to the database
const connect = async () => {
  try {
    connection = await sql.connect(dbConfig);
    if (connection) {
      console.log('Database connected successfully.');
    }
  } catch (error) {
    console.error('Error connecting to the database:', error);
    connection = null;
  }
};

const executeQuery = async (query) => {
  if (!connection) {
   connect();
  }
  try {
    const request = connection.request();
    const result = await request.query(query);
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};

const createTables = async () => {
    if (!connection) {
        connect();
       }
    if (process.env.NODE_ENV === 'development') {
      const createTableQuery = `
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Person')
        BEGIN
          CREATE TABLE Person (
            id INT IDENTITY(1,1) PRIMARY KEY,                  
            googleid VARCHAR(255),            
            Name VARCHAR(255),
            email VARCHAR(255)
          );
        END;
  
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PDFLINK')
        BEGIN
          CREATE TABLE PDFLINK (
            id INT IDENTITY(1,1) PRIMARY KEY,
            LINK VARCHAR(255),
            personId INT, 
            FOREIGN KEY (personId) REFERENCES Person(id)  
          );
        END
      `;
      try {
        await executeQuery(createTableQuery);
        console.log('Tables created successfully.');
      } catch (err) {
        console.error(`Error creating tables: ${err}`);
      }
    }
  };
  const insertUser = async (name, email,googleid) => {
    if (!connection) {
        connect();
       }
    const insertUserQuery = `
      INSERT INTO Person (name, email,googleid)
      VALUES (@name, @email,@googleid);
    `;
  
    try {
      const request = connection.request(); 
      request.input('Name', sql.VarChar(255), name);
      request.input('email', sql.VarChar(255), email); 
      request.input('googleid',sql.VarChar(255),googleid)
  
      const result = await request.query(insertUserQuery); 
      console.log(result);
      if(result){
      console.log(`User added with ID: ${result.recordset[0].id}`);
      return result.rowsAffected[0];
      }


    } catch (error) {
      console.error(`Error inserting user: ${error}`);
      throw error;
    }
  };
  
  const insertPDFLink = async (link, personId) => {
    if (!connection) {
        connect();
       }
    const insertPDFLinkQuery = `
      INSERT INTO PDFLINK (LINK, personId)
      VALUES (@link, @personId);
    `;
  
    try {
      const request = connection.request(); 
      request.input('link', sql.VarChar(255), link);   
      request.input('personId', sql.Int, personId); 
  
      const result = await request.query(insertPDFLinkQuery);
      console.log(`PDF link added with ID: ${result.recordset[0].id}`);
      return result.rowsAffected[0]; 
    } catch (error) {
      console.error(`Error inserting PDF link: ${error}`);
      throw error; 
    }
  };
  const checkUserByGoogleId = async (googleid) => {
    if (!connection) {
        connect();
       }
    const checkUserQuery = `
      SELECT id FROM Person WHERE googleid = @googleid;
    `;
  
    try {
        console.log(connection);
      const request = connection.request();
      request.input('googleid', sql.VarChar(255), googleid); 
      
      const result = await request.query(checkUserQuery);
      console.log(result);
  
      
      return result.recordset.length > 0;
    } catch (error) {
      console.error(`Error checking user: ${error}`);
      throw error; 
    }
  };
  
  

export {connect,createTables,checkUserByGoogleId,insertUser,insertPDFLink};