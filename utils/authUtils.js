const isEmailValidate = ({ key }) => {
  const isEmail =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i.test(
      key
    );
  return isEmail;
};

const userDataValidation = ({ email, username, password }) => {
  return new Promise((resolve, reject) => {
    if (!email || !username || !password) reject("Missing user data");

    if (typeof email !== "String") reject("Email is not a text");
    if (typeof username !== "String") reject("Username is not a text");
    if (typeof password !== "String") reject("Password is not a text");

    if (username.length < 3 || username.length > 50)
      reject("Username length should be 3-50");

    if (!isEmailValidate({ key: email }))
      reject("Format of an Email is Incorrect");

    resolve();
  });
};

module.exports = { userDataValidation, isEmailValidate };
