// import { parseSource } from "./codeParser.js";
// import { getExtractor } from "../extractor/extractorRegistry.js";

// const sourceCode = `
// import os
// import pandas as pd
// from flask import Flask, request
// from models.user import User
// from utils.helper import hash_password as hashPassword

// class UserService:

//     def __init__(self):
//         self.name = "UserService"

//     def create_user(self, data):
//         return data

//     def login_user(self, email, password):
//         return True

// def login(email, password):
//     return True
// `;

// const language = "Python";
// const extension = ".py";

// const parsed = parseSource({
//   sourceCode,
//   language,
//   extension,
// });

// if (!parsed.success) {
//   console.error("Parser error:", parsed.error);
//   process.exit(1);
// }

// const extractor = getExtractor(language);

// if (!extractor) {
//   console.error(`No extractor found for ${language}`);
//   process.exit(1);
// }

// const result = extractor(parsed.tree);

// console.log("\n=== SYMBOLS ===");

// console.dir(result.symbols, {
//   depth: null,
// });

// console.log("\n=== REFERENCES ===");

// console.dir(result.references, {
//   depth: null,
// });

// Test For TypeScript
// import { parseSource } from "./codeParser.js";
// import { getExtractor } from "../extractor/extractorRegistry.js";

// const sourceCode = `
// import User from "./User";
// import { loginUser, logoutUser as signOut } from "./authService";
// import * as Utils from "./utils";

// export interface UserProfile {
//   id: string;
//   name: string;
// }

// export type UserId = string;

// export enum UserStatus {
//   ACTIVE,
//   INACTIVE
// }

// export class UserService {

//   login(email: string, password: string): boolean {
//     return true;
//   }

//   logout(): void {
//     console.log("logout");
//   }
// }

// export function createUser(name: string): UserProfile {
//   return {
//     id: "1",
//     name
//   };
// }

// const deleteUser = (id: UserId): void => {
//   console.log(id);
// };

// export default UserService;

// export { loginUser, signOut };
// `;

// const language = "TypeScript";
// const extension = ".ts";

// const parsed = parseSource({
//   sourceCode,
//   language,
//   extension,
// });

// if (!parsed.success) {
//   console.error("Parser error:", parsed.error);
//   process.exit(1);
// }

// const extractor = getExtractor(language);

// if (!extractor) {
//   console.error(`No extractor found for ${language}`);
//   process.exit(1);
// }

// const result = extractor(parsed.tree);

// console.log("\n=== SYMBOLS ===");

// console.dir(result.symbols, {
//   depth: null,
// });

// console.log("\n=== REFERENCES ===");

// console.dir(result.references, {
//   depth: null,
// });

// Test for Java
import { parseSource } from "./codeParser.js";
import { getExtractor } from "../extractor/extractorRegistry.js";

const sourceCode = `
package com.example.user;

import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import static java.lang.Math.*;

public class UserService {

    private String serviceName;

    public UserService() {
        this.serviceName = "UserService";
    }

    public User findUser(String id) {
        return null;
    }

    public void deleteUser(String id) {
        System.out.println(id);
    }
}

interface UserRepository {
    User findById(String id);
}

enum UserStatus {
    ACTIVE,
    INACTIVE
}

class UserController {

    public void login(String email, String password) {
        System.out.println(email);
    }
}
`;

const language = "Java";
const extension = ".java";

const parsed = parseSource({
  sourceCode,
  language,
  extension,
});

if (!parsed.success) {
  console.error("Parser error:", parsed.error);
  process.exit(1);
}

const extractor = getExtractor(language);

if (!extractor) {
  console.error(`No extractor found for ${language}`);
  process.exit(1);
}

const result = extractor(parsed.tree);

console.log("\n=== SYMBOLS ===");

console.dir(result.symbols, {
  depth: null,
});

console.log("\n=== REFERENCES ===");

console.dir(result.references, {
  depth: null,
});
