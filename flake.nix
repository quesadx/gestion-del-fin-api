{
  description = "Flake for basic web dependencies";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      pythonEnv = pkgs.python3.withPackages (ps: with ps; [
        scikit-learn
        fastapi
        uvicorn
        pandas
        numpy
        pydantic
        sentence-transformers
      ]);
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs_20
          go
          openssl
          pkg-config
          prisma-engines_7
          pythonEnv
        ];

        shellHook = ''
          export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath [ pkgs.openssl ]}:$LD_LIBRARY_PATH
          export PATH="${pkgs.openssl}/bin:$PATH"
        '';
      };
    };
}
